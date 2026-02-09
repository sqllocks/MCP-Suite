/**
 * Sequence Diagram Generator (PlantUML-style)
 * Professional UML sequence diagrams for system interactions
 */

export type MessageType = 'sync' | 'async' | 'return' | 'create' | 'destroy';
export type ActivationType = 'activate' | 'deactivate';

export interface Actor {
  id: string;
  name: string;
  type: 'actor' | 'participant' | 'database' | 'boundary' | 'control' | 'entity';
  color?: string;
}

export interface Message {
  from: string;
  to: string;
  text: string;
  type: MessageType;
  response?: string;
}

export interface Note {
  text: string;
  position: 'left' | 'right' | 'over';
  actor?: string;
  actors?: string[];
}

export interface SequenceDiagramOptions {
  title?: string;
  style: 'plantuml' | 'clean' | 'minimal';
  showActivations: boolean;
  showLifelines: boolean;
  autoNumbering: boolean;
  fontSize: number;
}

export class SequenceDiagramGenerator {
  private readonly DEFAULT_OPTIONS: SequenceDiagramOptions = {
    style: 'plantuml',
    showActivations: true,
    showLifelines: true,
    autoNumbering: false,
    fontSize: 13,
  };

  private readonly ACTOR_COLORS = {
    actor: '#A9DCE3',
    participant: '#F9E79F',
    database: '#D7BDE2',
    boundary: '#F5B7B1',
    control: '#AED6F1',
    entity: '#ABEBC6',
  };

  generate(
    actors: Actor[],
    messages: Message[],
    notes?: Note[],
    options?: Partial<SequenceDiagramOptions>
  ): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    const actorSpacing = 180;
    const actorY = 100;
    const messageStartY = 180;
    const messageSpacing = 60;
    
    const width = actors.length * actorSpacing + 100;
    const height = messageStartY + messages.length * messageSpacing + 150;

    const actorPositions = new Map<string, number>();
    actors.forEach((actor, index) => {
      actorPositions.set(actor.id, 100 + index * actorSpacing);
    });

    return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>${this.generateDefs()}</defs>
  <style>${this.generateStyles(opts)}</style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="white"/>

  <!-- Title -->
  ${opts.title ? `
  <text x="${width / 2}" y="30" class="diagram-title" text-anchor="middle">
    ${opts.title}
  </text>` : ''}

  <!-- Actors at top -->
  <g id="actors-top">
    ${actors.map((actor, i) => this.renderActor(actor, actorPositions.get(actor.id)!, actorY, opts)).join('\n')}
  </g>

  <!-- Lifelines -->
  ${opts.showLifelines ? `
  <g id="lifelines">
    ${actors.map(actor => {
      const x = actorPositions.get(actor.id)!;
      return `<line x1="${x}" y1="${actorY + 60}" x2="${x}" y2="${height - 100}" 
                    stroke="#CCC" stroke-width="2" stroke-dasharray="5,5"/>`;
    }).join('\n')}
  </g>` : ''}

  <!-- Messages -->
  <g id="messages">
    ${messages.map((msg, i) => 
      this.renderMessage(msg, i, actorPositions, messageStartY, messageSpacing, opts)
    ).join('\n')}
  </g>

  <!-- Notes -->
  ${notes ? notes.map(note => this.renderNote(note, actorPositions, messageStartY, opts)).join('\n') : ''}

  <!-- Actors at bottom -->
  <g id="actors-bottom">
    ${actors.map((actor, i) => this.renderActor(actor, actorPositions.get(actor.id)!, height - 80, opts)).join('\n')}
  </g>
</svg>`;
  }

  private renderActor(actor: Actor, x: number, y: number, opts: SequenceDiagramOptions): string {
    const color = actor.color || this.ACTOR_COLORS[actor.type];
    const width = 120;
    const height = 50;

    const shapes: Record<Actor['type'], string> = {
      actor: `
        <ellipse cx="${x}" cy="${y - 25}" rx="15" ry="15" fill="${color}"/>
        <line x1="${x}" y1="${y - 10}" x2="${x}" y2="${y + 20}" stroke="#333" stroke-width="2"/>
        <line x1="${x - 20}" y1="${y}" x2="${x + 20}" y2="${y}" stroke="#333" stroke-width="2"/>
        <line x1="${x}" y1="${y + 20}" x2="${x - 15}" y2="${y + 40}" stroke="#333" stroke-width="2"/>
        <line x1="${x}" y1="${y + 20}" x2="${x + 15}" y2="${y + 40}" stroke="#333" stroke-width="2"/>`,
      
      participant: `
        <rect x="${x - width / 2}" y="${y - 25}" width="${width}" height="${height}" 
              fill="${color}" stroke="#333" stroke-width="2" rx="5"/>`,
      
      database: `
        <ellipse cx="${x}" cy="${y - 15}" rx="${width / 2}" ry="15" fill="${color}" stroke="#333" stroke-width="2"/>
        <rect x="${x - width / 2}" y="${y - 15}" width="${width}" height="30" fill="${color}"/>
        <ellipse cx="${x}" cy="${y + 15}" rx="${width / 2}" ry="15" fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      boundary: `
        <circle cx="${x}" cy="${y}" r="25" fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      control: `
        <circle cx="${x}" cy="${y}" r="25" fill="${color}" stroke="#333" stroke-width="2"/>`,
      
      entity: `
        <circle cx="${x}" cy="${y}" r="25" fill="${color}" stroke="#333" stroke-width="2"/>`,
    };

    return `
    <g class="actor">
      ${shapes[actor.type]}
      <text x="${x}" y="${y + 45}" class="actor-name" text-anchor="middle">
        ${actor.name}
      </text>
    </g>`;
  }

  private renderMessage(
    msg: Message,
    index: number,
    actorPositions: Map<string, number>,
    startY: number,
    spacing: number,
    opts: SequenceDiagramOptions
  ): string {
    const fromX = actorPositions.get(msg.from)!;
    const toX = actorPositions.get(msg.to)!;
    const y = startY + index * spacing;

    const messageStyles = {
      sync: { arrow: 'solid-arrow', stroke: '#333', strokeWidth: 2, dashArray: 'none' },
      async: { arrow: 'open-arrow', stroke: '#333', strokeWidth: 2, dashArray: 'none' },
      return: { arrow: 'open-arrow', stroke: '#666', strokeWidth: 1.5, dashArray: '5,5' },
      create: { arrow: 'solid-arrow', stroke: '#107C10', strokeWidth: 2, dashArray: 'none' },
      destroy: { arrow: 'solid-arrow', stroke: '#E74856', strokeWidth: 2, dashArray: 'none' },
    };

    const style = messageStyles[msg.type];
    const direction = toX > fromX ? 1 : -1;
    const labelX = (fromX + toX) / 2;
    const labelY = y - 5;

    return `
    <g class="message">
      <!-- Message number -->
      ${opts.autoNumbering ? `
      <circle cx="${fromX - 20}" cy="${y}" r="12" fill="white" stroke="#333" stroke-width="1"/>
      <text x="${fromX - 20}" y="${y + 5}" class="message-number" text-anchor="middle">
        ${index + 1}
      </text>` : ''}

      <!-- Message line -->
      <line x1="${fromX}" y1="${y}" x2="${toX}" y2="${y}"
            stroke="${style.stroke}" stroke-width="${style.strokeWidth}"
            stroke-dasharray="${style.dashArray}"
            marker-end="url(#${style.arrow})"/>

      <!-- Message label -->
      <rect x="${labelX - 60}" y="${labelY - 12}" width="120" height="18"
            fill="white" opacity="0.9"/>
      <text x="${labelX}" y="${labelY}" class="message-text" text-anchor="middle">
        ${msg.text}
      </text>

      <!-- Activation box -->
      ${opts.showActivations && msg.type === 'sync' ? `
      <rect x="${toX - 5}" y="${y}" width="10" height="${spacing * 0.8}"
            fill="#F0F0F0" stroke="#333" stroke-width="1"/>` : ''}

      <!-- Return message -->
      ${msg.response ? `
      <line x1="${toX}" y1="${y + spacing / 2}" x2="${fromX}" y2="${y + spacing / 2}"
            stroke="#666" stroke-width="1.5" stroke-dasharray="5,5"
            marker-end="url(#open-arrow)"/>
      <text x="${labelX}" y="${y + spacing / 2 - 5}" class="return-text" text-anchor="middle">
        ${msg.response}
      </text>` : ''}
    </g>`;
  }

  private renderNote(
    note: Note,
    actorPositions: Map<string, number>,
    startY: number,
    opts: SequenceDiagramOptions
  ): string {
    let x = 0;
    let width = 150;

    if (note.position === 'over' && note.actors) {
      const positions = note.actors.map(a => actorPositions.get(a)!);
      x = Math.min(...positions);
      width = Math.max(...positions) - x + 20;
    } else if (note.actor) {
      x = actorPositions.get(note.actor)!;
      x = note.position === 'left' ? x - width - 10 : x + 10;
    }

    const y = startY - 40;

    return `
    <g class="note">
      <rect x="${x}" y="${y}" width="${width}" height="60"
            fill="#FFFACD" stroke="#666" stroke-width="1" rx="5"/>
      <foreignObject x="${x + 5}" y="${y + 5}" width="${width - 10}" height="50">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font: 11px 'Segoe UI'; color: #333;">
          ${note.text}
        </div>
      </foreignObject>
    </g>`;
  }

  private generateDefs(): string {
    return `
    <!-- Solid arrow -->
    <marker id="solid-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#333"/>
    </marker>

    <!-- Open arrow -->
    <marker id="open-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <path d="M 0,0 L 10,3 L 0,6" fill="none" stroke="#666" stroke-width="1.5"/>
    </marker>`;
  }

  private generateStyles(opts: SequenceDiagramOptions): string {
    return `
    .diagram-title { font: bold 20px 'Segoe UI'; fill: #333; }
    .actor-name { font: 600 ${opts.fontSize}px 'Segoe UI'; fill: #333; }
    .message-text { font: ${opts.fontSize}px 'Segoe UI'; fill: #333; }
    .return-text { font: ${opts.fontSize - 1}px 'Segoe UI'; fill: #666; font-style: italic; }
    .message-number { font: bold 10px 'Segoe UI'; fill: #333; }`;
  }
}
