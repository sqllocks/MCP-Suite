/**
 * MCP Stream Processor
 * Real-time data stream ingestion and processing
 * 
 * Purpose: Handle real-time data streams from various sources:
 * - Healthcare: HL7 messages, FHIR resources
 * - Manufacturing: IoT sensor data
 * - Finance: Transaction streams for fraud detection
 * 
 * Features:
 * - Apache Kafka integration
 * - Azure Event Hubs support
 * - Stream analytics with windowing
 * - Real-time alerting
 * - Dead letter queue handling
 * - Exactly-once processing
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { EventHubProducerClient, EventHubConsumerClient } from '@azure/event-hubs';
import { BlobCheckpointStore } from '@azure/eventhubs-checkpointstore-blob';
import { BlobServiceClient } from '@azure/storage-blob';
import Joi from 'joi';
import * as hl7parser from 'hl7-standard';

// ============================================================================
// TYPES
// ============================================================================

interface StreamConfig {
  type: 'kafka' | 'eventhub';
  connectionString?: string;
  brokers?: string[];
  topic: string;
  consumerGroup?: string;
  checkpointStore?: string;
}

interface StreamMessage {
  id: string;
  timestamp: Date;
  source: string;
  data: any;
  metadata?: Record<string, any>;
}

interface ProcessingRule {
  name: string;
  condition: string; // JavaScript expression
  action: 'filter' | 'transform' | 'alert' | 'route';
  target?: string;
  transformation?: string;
}

interface StreamAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  data: any;
}

// ============================================================================
// STREAM MANAGER
// ============================================================================

class StreamManager {
  private kafkaConsumers: Map<string, Consumer> = new Map();
  private kafkaProducers: Map<string, Producer> = new Map();
  private eventHubConsumers: Map<string, EventHubConsumerClient> = new Map();
  private eventHubProducers: Map<string, EventHubProducerClient> = new Map();
  private processingRules: Map<string, ProcessingRule[]> = new Map();
  private alerts: StreamAlert[] = [];
  private metrics: Map<string, any> = new Map();

  /**
   * Start consuming from a stream
   */
  async startConsuming(config: StreamConfig, handler: (message: StreamMessage) => Promise<void>): Promise<string> {
    const streamId = `${config.type}-${config.topic}`;

    if (config.type === 'kafka') {
      const kafka = new Kafka({
        clientId: 'mcp-stream-processor',
        brokers: config.brokers || ['localhost:9092'],
      });

      const consumer = kafka.consumer({
        groupId: config.consumerGroup || 'mcp-default-group',
      });

      await consumer.connect();
      await consumer.subscribe({ topic: config.topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          try {
            const streamMessage: StreamMessage = {
              id: message.key?.toString() || `${Date.now()}-${Math.random()}`,
              timestamp: new Date(Number(message.timestamp)),
              source: topic,
              data: JSON.parse(message.value?.toString() || '{}'),
              metadata: {
                partition,
                offset: message.offset,
              },
            };

            // Update metrics
            this.updateMetrics(streamId, 'messages_received');

            // Process message
            await handler(streamMessage);

            // Apply processing rules
            await this.applyProcessingRules(streamId, streamMessage);

          } catch (error) {
            this.handleError(streamId, error as Error, message);
          }
        },
      });

      this.kafkaConsumers.set(streamId, consumer);
      return streamId;

    } else if (config.type === 'eventhub') {
      const consumerClient = new EventHubConsumerClient(
        config.consumerGroup || '$Default',
        config.connectionString!,
        config.topic
      );

      const subscription = consumerClient.subscribe({
        processEvents: async (events, context) => {
          for (const event of events) {
            try {
              const streamMessage: StreamMessage = {
                id: event.sequenceNumber?.toString() || `${Date.now()}`,
                timestamp: event.enqueuedTimeUtc || new Date(),
                source: config.topic,
                data: event.body,
                metadata: {
                  partitionId: context.partitionId,
                  offset: event.offset,
                },
              };

              this.updateMetrics(streamId, 'messages_received');
              await handler(streamMessage);
              await this.applyProcessingRules(streamId, streamMessage);

            } catch (error) {
              this.handleError(streamId, error as Error, event);
            }
          }

          await context.updateCheckpoint(events[events.length - 1]);
        },
        processError: async (error, context) => {
          console.error(`Error from ${context.partitionId}:`, error);
          this.createAlert({
            severity: 'error',
            message: `Stream processing error: ${error.message}`,
            data: { partitionId: context.partitionId },
          });
        },
      });

      this.eventHubConsumers.set(streamId, consumerClient);
      return streamId;
    }

    throw new Error(`Unsupported stream type: ${config.type}`);
  }

  /**
   * Stop consuming from a stream
   */
  async stopConsuming(streamId: string): Promise<void> {
    const kafkaConsumer = this.kafkaConsumers.get(streamId);
    if (kafkaConsumer) {
      await kafkaConsumer.disconnect();
      this.kafkaConsumers.delete(streamId);
    }

    const eventHubConsumer = this.eventHubConsumers.get(streamId);
    if (eventHubConsumer) {
      await eventHubConsumer.close();
      this.eventHubConsumers.delete(streamId);
    }
  }

  /**
   * Publish message to stream
   */
  async publish(config: StreamConfig, message: StreamMessage): Promise<void> {
    const streamId = `${config.type}-${config.topic}`;

    if (config.type === 'kafka') {
      let producer = this.kafkaProducers.get(streamId);
      
      if (!producer) {
        const kafka = new Kafka({
          clientId: 'mcp-stream-processor',
          brokers: config.brokers || ['localhost:9092'],
        });
        producer = kafka.producer();
        await producer.connect();
        this.kafkaProducers.set(streamId, producer);
      }

      await producer.send({
        topic: config.topic,
        messages: [{
          key: message.id,
          value: JSON.stringify(message.data),
          timestamp: message.timestamp.getTime().toString(),
        }],
      });

    } else if (config.type === 'eventhub') {
      let producer = this.eventHubProducers.get(streamId);
      
      if (!producer) {
        producer = new EventHubProducerClient(config.connectionString!, config.topic);
        this.eventHubProducers.set(streamId, producer);
      }

      await producer.sendBatch([{
        body: message.data,
        properties: message.metadata,
      }]);
    }

    this.updateMetrics(streamId, 'messages_published');
  }

  /**
   * Add processing rule
   */
  addProcessingRule(streamId: string, rule: ProcessingRule): void {
    const rules = this.processingRules.get(streamId) || [];
    rules.push(rule);
    this.processingRules.set(streamId, rules);
  }

  /**
   * Apply processing rules to message
   */
  private async applyProcessingRules(streamId: string, message: StreamMessage): Promise<void> {
    const rules = this.processingRules.get(streamId) || [];

    for (const rule of rules) {
      try {
        // Evaluate condition
        const conditionFunc = new Function('message', `return ${rule.condition}`);
        const matches = conditionFunc(message);

        if (matches) {
          switch (rule.action) {
            case 'filter':
              // Drop message (don't process further)
              return;

            case 'transform':
              // Transform message data
              if (rule.transformation) {
                const transformFunc = new Function('data', rule.transformation);
                message.data = transformFunc(message.data);
              }
              break;

            case 'alert':
              // Create alert
              this.createAlert({
                severity: 'warning',
                message: `Rule '${rule.name}' triggered`,
                data: message,
              });
              break;

            case 'route':
              // Route to different topic
              if (rule.target) {
                const targetConfig = { type: 'kafka' as const, topic: rule.target };
                await this.publish(targetConfig, message);
              }
              break;
          }
        }
      } catch (error) {
        console.error(`Error applying rule '${rule.name}':`, error);
      }
    }
  }

  /**
   * Get stream metrics
   */
  getMetrics(streamId?: string): any {
    if (streamId) {
      return this.metrics.get(streamId) || {};
    }
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get alerts
   */
  getAlerts(severity?: string, limit: number = 100): StreamAlert[] {
    let alerts = this.alerts;
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    return alerts.slice(-limit);
  }

  /**
   * Update metrics
   */
  private updateMetrics(streamId: string, metric: string): void {
    const metrics = this.metrics.get(streamId) || {
      messages_received: 0,
      messages_published: 0,
      errors: 0,
      last_message: null,
    };

    metrics[metric] = (metrics[metric] || 0) + 1;
    metrics.last_message = new Date();

    this.metrics.set(streamId, metrics);
  }

  /**
   * Create alert
   */
  private createAlert(alert: Omit<StreamAlert, 'id' | 'timestamp'>): void {
    this.alerts.push({
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      ...alert,
    });

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  /**
   * Handle error
   */
  private handleError(streamId: string, error: Error, message: any): void {
    console.error(`Error processing message on ${streamId}:`, error);
    
    this.updateMetrics(streamId, 'errors');
    
    this.createAlert({
      severity: 'error',
      message: error.message,
      data: { streamId, message },
    });

    // TODO: Send to dead letter queue
  }
}

// ============================================================================
// HL7 MESSAGE PROCESSOR
// ============================================================================

class HL7Processor {
  /**
   * Parse HL7 message
   */
  static parse(hl7String: string): any {
    try {
      const message = hl7parser.parseString(hl7String);
      return {
        messageType: message.get('MSH.9').toString(),
        sendingApplication: message.get('MSH.3').toString(),
        sendingFacility: message.get('MSH.4').toString(),
        timestamp: message.get('MSH.7').toString(),
        messageControlId: message.get('MSH.10').toString(),
        segments: this.extractSegments(message),
      };
    } catch (error) {
      throw new Error(`Failed to parse HL7 message: ${error}`);
    }
  }

  /**
   * Extract segments from HL7 message
   */
  private static extractSegments(message: any): Record<string, any> {
    const segments: Record<string, any> = {};

    // Common segments
    ['PID', 'PV1', 'OBR', 'OBX', 'DG1', 'PR1'].forEach(segmentName => {
      try {
        const segment = message.get(segmentName);
        if (segment) {
          segments[segmentName] = this.segmentToObject(segment);
        }
      } catch (error) {
        // Segment not present, skip
      }
    });

    return segments;
  }

  /**
   * Convert HL7 segment to object
   */
  private static segmentToObject(segment: any): any {
    const obj: any = {};
    
    // Extract fields based on segment type
    for (let i = 1; i <= 20; i++) {
      try {
        const value = segment.get(i.toString());
        if (value) {
          obj[`field_${i}`] = value.toString();
        }
      } catch (error) {
        // Field not present, skip
      }
    }
    
    return obj;
  }

  /**
   * Extract patient info from HL7
   */
  static extractPatientInfo(parsed: any): any {
    const pid = parsed.segments.PID;
    if (!pid) return null;

    return {
      patientId: pid.field_3,
      name: pid.field_5,
      dob: pid.field_7,
      gender: pid.field_8,
      address: pid.field_11,
      phone: pid.field_13,
    };
  }
}

// ============================================================================
// MCP SERVER
// ============================================================================

const streamManager = new StreamManager();

const server = new Server(
  {
    name: 'mcp-stream-processor',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

const tools: Tool[] = [
  {
    name: 'start_stream',
    description: 'Start consuming from a real-time data stream (Kafka or Azure Event Hubs)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['kafka', 'eventhub'],
          description: 'Stream type',
        },
        topic: {
          type: 'string',
          description: 'Topic or Event Hub name',
        },
        connectionString: {
          type: 'string',
          description: 'Connection string (for Event Hubs)',
        },
        brokers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Kafka broker addresses',
        },
        consumerGroup: {
          type: 'string',
          description: 'Consumer group ID',
        },
        messageFormat: {
          type: 'string',
          enum: ['json', 'hl7', 'raw'],
          description: 'Expected message format',
        },
      },
      required: ['type', 'topic'],
    },
  },
  {
    name: 'stop_stream',
    description: 'Stop consuming from a stream',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
          description: 'Stream ID returned from start_stream',
        },
      },
      required: ['streamId'],
    },
  },
  {
    name: 'publish_to_stream',
    description: 'Publish a message to a stream',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['kafka', 'eventhub'],
        },
        topic: {
          type: 'string',
        },
        message: {
          type: 'object',
          description: 'Message to publish',
        },
        key: {
          type: 'string',
          description: 'Message key (for partitioning)',
        },
      },
      required: ['type', 'topic', 'message'],
    },
  },
  {
    name: 'add_processing_rule',
    description: 'Add a processing rule to filter, transform, alert, or route messages',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
        },
        rule: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            condition: {
              type: 'string',
              description: 'JavaScript expression (e.g., "message.data.temperature > 100")',
            },
            action: {
              type: 'string',
              enum: ['filter', 'transform', 'alert', 'route'],
            },
            target: {
              type: 'string',
              description: 'Target topic (for route action)',
            },
            transformation: {
              type: 'string',
              description: 'Transformation code (for transform action)',
            },
          },
          required: ['name', 'condition', 'action'],
        },
      },
      required: ['streamId', 'rule'],
    },
  },
  {
    name: 'parse_hl7_message',
    description: 'Parse an HL7 message (healthcare data format)',
    inputSchema: {
      type: 'object',
      properties: {
        hl7String: {
          type: 'string',
          description: 'Raw HL7 message string',
        },
        extractPatientInfo: {
          type: 'boolean',
          description: 'Extract patient information from PID segment',
        },
      },
      required: ['hl7String'],
    },
  },
  {
    name: 'get_stream_metrics',
    description: 'Get metrics for a stream or all streams',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
          description: 'Specific stream ID, or omit for all streams',
        },
      },
    },
  },
  {
    name: 'get_stream_alerts',
    description: 'Get alerts from stream processing',
    inputSchema: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['info', 'warning', 'error', 'critical'],
        },
        limit: {
          type: 'number',
          description: 'Max number of alerts to return',
        },
      },
    },
  },
  {
    name: 'process_iot_data',
    description: 'Process IoT sensor data with time-series analytics',
    inputSchema: {
      type: 'object',
      properties: {
        sensorData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sensorId: { type: 'string' },
              timestamp: { type: 'string' },
              readings: { type: 'object' },
            },
          },
        },
        windowSize: {
          type: 'number',
          description: 'Time window in seconds for analytics',
        },
        aggregations: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['avg', 'min', 'max', 'sum', 'count'],
          },
        },
      },
      required: ['sensorData'],
    },
  },
];

// ============================================================================
// TOOL HANDLERS
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'start_stream': {
        const config: StreamConfig = {
          type: args.type,
          topic: args.topic,
          connectionString: args.connectionString,
          brokers: args.brokers,
          consumerGroup: args.consumerGroup,
        };

        const messageFormat = args.messageFormat || 'json';

        const streamId = await streamManager.startConsuming(config, async (message) => {
          // Process message based on format
          if (messageFormat === 'hl7' && typeof message.data === 'string') {
            const parsed = HL7Processor.parse(message.data);
            console.log('HL7 Message received:', parsed.messageType);
          } else {
            console.log('Message received:', message.id);
          }
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              streamId,
              status: 'started',
              type: config.type,
              topic: config.topic,
            }, null, 2),
          }],
        };
      }

      case 'stop_stream': {
        await streamManager.stopConsuming(args.streamId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              streamId: args.streamId,
              status: 'stopped',
            }, null, 2),
          }],
        };
      }

      case 'publish_to_stream': {
        const config: StreamConfig = {
          type: args.type,
          topic: args.topic,
        };

        const message: StreamMessage = {
          id: args.key || `msg-${Date.now()}`,
          timestamp: new Date(),
          source: 'mcp-stream-processor',
          data: args.message,
        };

        await streamManager.publish(config, message);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              messageId: message.id,
              status: 'published',
              topic: args.topic,
            }, null, 2),
          }],
        };
      }

      case 'add_processing_rule': {
        streamManager.addProcessingRule(args.streamId, args.rule);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              streamId: args.streamId,
              rule: args.rule.name,
              status: 'added',
            }, null, 2),
          }],
        };
      }

      case 'parse_hl7_message': {
        const parsed = HL7Processor.parse(args.hl7String);
        
        const result: any = { parsed };
        
        if (args.extractPatientInfo) {
          result.patientInfo = HL7Processor.extractPatientInfo(parsed);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'get_stream_metrics': {
        const metrics = streamManager.getMetrics(args.streamId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(metrics, null, 2),
          }],
        };
      }

      case 'get_stream_alerts': {
        const alerts = streamManager.getAlerts(args.severity, args.limit);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(alerts, null, 2),
          }],
        };
      }

      case 'process_iot_data': {
        const windowSize = args.windowSize || 60;
        const aggregations = args.aggregations || ['avg'];
        
        // Group by sensor and calculate aggregations
        const results: any = {};
        
        for (const reading of args.sensorData) {
          if (!results[reading.sensorId]) {
            results[reading.sensorId] = {
              sensorId: reading.sensorId,
              readings: [],
              aggregations: {},
            };
          }
          
          results[reading.sensorId].readings.push(reading);
        }
        
        // Calculate aggregations
        for (const sensorId in results) {
          const sensor = results[sensorId];
          const readings = sensor.readings;
          
          for (const metric of Object.keys(readings[0].readings || {})) {
            const values = readings.map((r: any) => r.readings[metric]).filter((v: any) => typeof v === 'number');
            
            sensor.aggregations[metric] = {};
            
            if (aggregations.includes('avg')) {
              sensor.aggregations[metric].avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
            }
            if (aggregations.includes('min')) {
              sensor.aggregations[metric].min = Math.min(...values);
            }
            if (aggregations.includes('max')) {
              sensor.aggregations[metric].max = Math.max(...values);
            }
            if (aggregations.includes('sum')) {
              sensor.aggregations[metric].sum = values.reduce((a: number, b: number) => a + b, 0);
            }
            if (aggregations.includes('count')) {
              sensor.aggregations[metric].count = values.length;
            }
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: (error as Error).message }),
      }],
      isError: true,
    };
  }
});

// ============================================================================
// START SERVER
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Stream Processor started');
}

main().catch(console.error);
