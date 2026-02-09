/**
 * MCP ML Inference
 * Machine Learning model deployment and inference
 * 
 * Purpose: Deploy and run ML models for predictive analytics:
 * - Healthcare: Patient readmission prediction, diagnosis assistance
 * - Finance: Fraud detection, credit risk scoring
 * - Retail: Product recommendations, demand forecasting
 * - Manufacturing: Predictive maintenance, quality prediction
 * 
 * Features:
 * - Azure ML integration
 * - Local model deployment (ONNX, TensorFlow)
 * - Model versioning and A/B testing
 * - Feature engineering pipeline
 * - Batch and real-time inference
 * - Model monitoring and drift detection
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as onnx from 'onnxruntime-node';
import * as tf from '@tensorflow/tfjs-node';
import axios from 'axios';
import Joi from 'joi';

// ============================================================================
// TYPES
// ============================================================================

interface Model {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'clustering' | 'recommendation';
  framework: 'onnx' | 'tensorflow' | 'azure-ml' | 'custom';
  inputSchema: any;
  outputSchema: any;
  metadata?: Record<string, any>;
  performance?: ModelPerformance;
}

interface ModelPerformance {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mae?: number;
  rmse?: number;
  latencyMs?: number;
}

interface InferenceRequest {
  modelId: string;
  features: Record<string, any>;
  options?: {
    version?: string;
    abTest?: boolean;
    explainability?: boolean;
  };
}

interface InferenceResponse {
  modelId: string;
  version: string;
  prediction: any;
  confidence?: number;
  explanation?: any;
  latencyMs: number;
  timestamp: Date;
}

interface FeatureEngineering {
  transforms: Transform[];
}

interface Transform {
  name: string;
  type: 'normalize' | 'standardize' | 'encode' | 'bin' | 'polynomial' | 'custom';
  columns: string[];
  params?: Record<string, any>;
}

// ============================================================================
// MODEL REGISTRY
// ============================================================================

class ModelRegistry {
  private models: Map<string, Model> = new Map();
  private loadedModels: Map<string, any> = new Map();
  private inferenceHistory: InferenceResponse[] = [];
  private abTests: Map<string, ABTest> = new Map();

  /**
   * Register a model
   */
  registerModel(model: Model): void {
    this.models.set(model.id, model);
  }

  /**
   * Load model into memory
   */
  async loadModel(modelId: string, modelPath: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    let loadedModel: any;

    switch (model.framework) {
      case 'onnx':
        loadedModel = await onnx.InferenceSession.create(modelPath);
        break;

      case 'tensorflow':
        loadedModel = await tf.loadLayersModel(`file://${modelPath}`);
        break;

      case 'azure-ml':
        // Store endpoint info for Azure ML
        loadedModel = { endpoint: modelPath, type: 'azure-ml' };
        break;

      default:
        throw new Error(`Unsupported framework: ${model.framework}`);
    }

    this.loadedModels.set(modelId, loadedModel);
  }

  /**
   * Run inference
   */
  async predict(request: InferenceRequest): Promise<InferenceResponse> {
    const startTime = Date.now();
    const model = this.models.get(request.modelId);
    
    if (!model) {
      throw new Error(`Model ${request.modelId} not found`);
    }

    const loadedModel = this.loadedModels.get(request.modelId);
    if (!loadedModel) {
      throw new Error(`Model ${request.modelId} not loaded. Call load_model first.`);
    }

    let prediction: any;
    let confidence: number | undefined;

    // Check for A/B test
    if (request.options?.abTest) {
      const abTest = this.abTests.get(request.modelId);
      if (abTest) {
        // Randomly route to control or treatment
        const useVariant = Math.random() < abTest.trafficSplit;
        if (useVariant && abTest.variantModelId) {
          const variantModel = this.loadedModels.get(abTest.variantModelId);
          if (variantModel) {
            // Run on variant model
            prediction = await this.runInference(variantModel, model.framework, request.features);
            abTest.variantCount++;
          }
        } else {
          // Run on control model
          prediction = await this.runInference(loadedModel, model.framework, request.features);
          abTest.controlCount++;
        }
      }
    } else {
      // Normal inference
      prediction = await this.runInference(loadedModel, model.framework, request.features);
    }

    // Calculate confidence if classification
    if (model.type === 'classification' && Array.isArray(prediction)) {
      confidence = Math.max(...prediction);
      prediction = prediction.indexOf(confidence);
    }

    const latencyMs = Date.now() - startTime;

    const response: InferenceResponse = {
      modelId: request.modelId,
      version: model.version,
      prediction,
      confidence,
      latencyMs,
      timestamp: new Date(),
    };

    // Add explanation if requested
    if (request.options?.explainability) {
      response.explanation = this.generateExplanation(model, request.features, prediction);
    }

    // Store in history
    this.inferenceHistory.push(response);
    if (this.inferenceHistory.length > 10000) {
      this.inferenceHistory = this.inferenceHistory.slice(-10000);
    }

    // Update model performance
    if (model.performance) {
      model.performance.latencyMs = (model.performance.latencyMs || 0) * 0.9 + latencyMs * 0.1;
    }

    return response;
  }

  /**
   * Run inference on specific framework
   */
  private async runInference(loadedModel: any, framework: string, features: Record<string, any>): Promise<any> {
    switch (framework) {
      case 'onnx': {
        // Convert features to tensor
        const inputTensor = this.featuresToTensor(features);
        const feeds: Record<string, onnx.Tensor> = {
          input: new onnx.Tensor('float32', inputTensor, [1, inputTensor.length]),
        };
        
        const results = await loadedModel.run(feeds);
        return Array.from(results.output.data);
      }

      case 'tensorflow': {
        const inputTensor = this.featuresToTensor(features);
        const tfTensor = tf.tensor2d([inputTensor]);
        const result = loadedModel.predict(tfTensor) as tf.Tensor;
        return await result.data();
      }

      case 'azure-ml': {
        // Call Azure ML endpoint
        const response = await axios.post(loadedModel.endpoint, {
          data: [features],
        }, {
          headers: {
            'Content-Type': 'application/json',
            // Add API key from environment
          },
        });
        
        return response.data[0];
      }

      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * Convert features object to array
   */
  private featuresToTensor(features: Record<string, any>): number[] {
    // Sort keys to ensure consistent ordering
    const keys = Object.keys(features).sort();
    return keys.map(key => {
      const value = features[key];
      return typeof value === 'number' ? value : 0;
    });
  }

  /**
   * Generate explanation for prediction
   */
  private generateExplanation(model: Model, features: Record<string, any>, prediction: any): any {
    // Simple feature importance based on absolute values
    const importance: Record<string, number> = {};
    
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'number') {
        importance[key] = Math.abs(value);
      }
    }
    
    // Normalize to sum to 1
    const total = Object.values(importance).reduce((a, b) => a + b, 0);
    for (const key in importance) {
      importance[key] /= total;
    }
    
    // Sort by importance
    const sorted = Object.entries(importance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    return {
      topFeatures: sorted.map(([feature, importance]) => ({
        feature,
        importance: importance.toFixed(4),
        value: features[feature],
      })),
      prediction,
      modelType: model.type,
    };
  }

  /**
   * Batch inference
   */
  async predictBatch(requests: InferenceRequest[]): Promise<InferenceResponse[]> {
    // Run in parallel
    return Promise.all(requests.map(req => this.predict(req)));
  }

  /**
   * Setup A/B test
   */
  setupABTest(controlModelId: string, variantModelId: string, trafficSplit: number): void {
    this.abTests.set(controlModelId, {
      controlModelId,
      variantModelId,
      trafficSplit,
      controlCount: 0,
      variantCount: 0,
      startTime: new Date(),
    });
  }

  /**
   * Get A/B test results
   */
  getABTestResults(modelId: string): any {
    const test = this.abTests.get(modelId);
    if (!test) return null;

    return {
      controlModelId: test.controlModelId,
      variantModelId: test.variantModelId,
      trafficSplit: test.trafficSplit,
      controlCount: test.controlCount,
      variantCount: test.variantCount,
      duration: Date.now() - test.startTime.getTime(),
    };
  }

  /**
   * Get model performance metrics
   */
  getPerformanceMetrics(modelId: string): any {
    const model = this.models.get(modelId);
    if (!model) return null;

    const recentInferences = this.inferenceHistory
      .filter(i => i.modelId === modelId)
      .slice(-1000);

    const avgLatency = recentInferences.reduce((sum, i) => sum + i.latencyMs, 0) / recentInferences.length;
    
    return {
      modelId,
      version: model.version,
      totalInferences: recentInferences.length,
      avgLatencyMs: avgLatency.toFixed(2),
      performance: model.performance,
    };
  }

  /**
   * Detect model drift
   */
  detectDrift(modelId: string, recentData: any[], threshold: number = 0.1): any {
    // Simple drift detection based on prediction distribution
    const recentInferences = this.inferenceHistory
      .filter(i => i.modelId === modelId)
      .slice(-1000);

    if (recentInferences.length < 100) {
      return { hasDrift: false, message: 'Not enough data for drift detection' };
    }

    // Compare prediction distributions
    const oldPredictions = recentInferences.slice(0, 500).map(i => i.prediction);
    const newPredictions = recentInferences.slice(-500).map(i => i.prediction);

    // Calculate means
    const oldMean = oldPredictions.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) / oldPredictions.length;
    const newMean = newPredictions.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0) / newPredictions.length;

    const drift = Math.abs(oldMean - newMean) / (oldMean || 1);

    return {
      hasDrift: drift > threshold,
      driftScore: drift.toFixed(4),
      threshold,
      oldMean: oldMean.toFixed(4),
      newMean: newMean.toFixed(4),
      recommendation: drift > threshold ? 'Consider retraining the model' : 'Model is stable',
    };
  }

  /**
   * List all models
   */
  listModels(): Model[] {
    return Array.from(this.models.values());
  }
}

// ============================================================================
// FEATURE ENGINEERING
// ============================================================================

class FeatureEngineer {
  /**
   * Apply transforms to features
   */
  static transform(features: Record<string, any>, transforms: Transform[]): Record<string, any> {
    let transformed = { ...features };

    for (const transform of transforms) {
      transformed = this.applyTransform(transformed, transform);
    }

    return transformed;
  }

  /**
   * Apply single transform
   */
  private static applyTransform(features: Record<string, any>, transform: Transform): Record<string, any> {
    const result = { ...features };

    for (const column of transform.columns) {
      const value = features[column];
      
      if (value === undefined) continue;

      switch (transform.type) {
        case 'normalize':
          // Min-max normalization
          const min = transform.params?.min || 0;
          const max = transform.params?.max || 100;
          result[column] = (value - min) / (max - min);
          break;

        case 'standardize':
          // Z-score standardization
          const mean = transform.params?.mean || 0;
          const std = transform.params?.std || 1;
          result[column] = (value - mean) / std;
          break;

        case 'encode':
          // One-hot encoding or label encoding
          const mapping = transform.params?.mapping || {};
          result[column] = mapping[value] || 0;
          break;

        case 'bin':
          // Binning into categories
          const bins = transform.params?.bins || [0, 50, 100];
          for (let i = 0; i < bins.length - 1; i++) {
            if (value >= bins[i] && value < bins[i + 1]) {
              result[column] = i;
              break;
            }
          }
          break;

        case 'polynomial':
          // Polynomial features
          const degree = transform.params?.degree || 2;
          result[`${column}_poly${degree}`] = Math.pow(value, degree);
          break;
      }
    }

    return result;
  }
}

// ============================================================================
// A/B TEST
// ============================================================================

interface ABTest {
  controlModelId: string;
  variantModelId: string;
  trafficSplit: number; // 0-1, percentage to variant
  controlCount: number;
  variantCount: number;
  startTime: Date;
}

// ============================================================================
// MCP SERVER
// ============================================================================

const modelRegistry = new ModelRegistry();

const server = new Server(
  {
    name: 'mcp-ml-inference',
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
    name: 'register_model',
    description: 'Register a machine learning model',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        version: { type: 'string' },
        type: {
          type: 'string',
          enum: ['classification', 'regression', 'clustering', 'recommendation'],
        },
        framework: {
          type: 'string',
          enum: ['onnx', 'tensorflow', 'azure-ml', 'custom'],
        },
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object' },
        metadata: { type: 'object' },
      },
      required: ['id', 'name', 'version', 'type', 'framework'],
    },
  },
  {
    name: 'load_model',
    description: 'Load a model into memory for inference',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
        modelPath: {
          type: 'string',
          description: 'Path to model file or Azure ML endpoint URL',
        },
      },
      required: ['modelId', 'modelPath'],
    },
  },
  {
    name: 'predict',
    description: 'Run inference on a single input',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
        features: {
          type: 'object',
          description: 'Feature values as key-value pairs',
        },
        version: { type: 'string' },
        abTest: {
          type: 'boolean',
          description: 'Enable A/B testing if configured',
        },
        explainability: {
          type: 'boolean',
          description: 'Include prediction explanation',
        },
      },
      required: ['modelId', 'features'],
    },
  },
  {
    name: 'predict_batch',
    description: 'Run inference on multiple inputs',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
        featuresList: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of feature objects',
        },
      },
      required: ['modelId', 'featuresList'],
    },
  },
  {
    name: 'transform_features',
    description: 'Apply feature engineering transforms',
    inputSchema: {
      type: 'object',
      properties: {
        features: { type: 'object' },
        transforms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['normalize', 'standardize', 'encode', 'bin', 'polynomial'],
              },
              columns: {
                type: 'array',
                items: { type: 'string' },
              },
              params: { type: 'object' },
            },
          },
        },
      },
      required: ['features', 'transforms'],
    },
  },
  {
    name: 'setup_ab_test',
    description: 'Setup A/B test between two model versions',
    inputSchema: {
      type: 'object',
      properties: {
        controlModelId: { type: 'string' },
        variantModelId: { type: 'string' },
        trafficSplit: {
          type: 'number',
          description: 'Percentage of traffic to variant (0-1)',
        },
      },
      required: ['controlModelId', 'variantModelId', 'trafficSplit'],
    },
  },
  {
    name: 'get_ab_test_results',
    description: 'Get A/B test performance comparison',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
      },
      required: ['modelId'],
    },
  },
  {
    name: 'get_model_performance',
    description: 'Get model performance metrics',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
      },
      required: ['modelId'],
    },
  },
  {
    name: 'detect_model_drift',
    description: 'Detect if model predictions have drifted over time',
    inputSchema: {
      type: 'object',
      properties: {
        modelId: { type: 'string' },
        threshold: {
          type: 'number',
          description: 'Drift threshold (default 0.1)',
        },
      },
      required: ['modelId'],
    },
  },
  {
    name: 'list_models',
    description: 'List all registered models',
    inputSchema: {
      type: 'object',
      properties: {},
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
      case 'register_model': {
        const model: Model = {
          id: args.id,
          name: args.name,
          version: args.version,
          type: args.type,
          framework: args.framework,
          inputSchema: args.inputSchema,
          outputSchema: args.outputSchema,
          metadata: args.metadata,
        };

        modelRegistry.registerModel(model);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              modelId: model.id,
              status: 'registered',
              version: model.version,
            }, null, 2),
          }],
        };
      }

      case 'load_model': {
        await modelRegistry.loadModel(args.modelId, args.modelPath);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              modelId: args.modelId,
              status: 'loaded',
            }, null, 2),
          }],
        };
      }

      case 'predict': {
        const request: InferenceRequest = {
          modelId: args.modelId,
          features: args.features,
          options: {
            version: args.version,
            abTest: args.abTest,
            explainability: args.explainability,
          },
        };

        const result = await modelRegistry.predict(request);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'predict_batch': {
        const requests: InferenceRequest[] = args.featuresList.map((features: any) => ({
          modelId: args.modelId,
          features,
        }));

        const results = await modelRegistry.predictBatch(requests);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case 'transform_features': {
        const transformed = FeatureEngineer.transform(args.features, args.transforms);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(transformed, null, 2),
          }],
        };
      }

      case 'setup_ab_test': {
        modelRegistry.setupABTest(
          args.controlModelId,
          args.variantModelId,
          args.trafficSplit
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'ab_test_configured',
              control: args.controlModelId,
              variant: args.variantModelId,
              split: args.trafficSplit,
            }, null, 2),
          }],
        };
      }

      case 'get_ab_test_results': {
        const results = modelRegistry.getABTestResults(args.modelId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2),
          }],
        };
      }

      case 'get_model_performance': {
        const metrics = modelRegistry.getPerformanceMetrics(args.modelId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(metrics, null, 2),
          }],
        };
      }

      case 'detect_model_drift': {
        const drift = modelRegistry.detectDrift(args.modelId, [], args.threshold);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(drift, null, 2),
          }],
        };
      }

      case 'list_models': {
        const models = modelRegistry.listModels();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(models, null, 2),
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
  console.error('MCP ML Inference started');
}

main().catch(console.error);
