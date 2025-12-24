export type WorkflowType = 'CESSIONE_QUINTO' | 'CONTRACT_ANALYSIS' | 'GDPR_CHECK' | 'REDLINE_ADVISOR' | 'DEADLINE_EXTRACTOR';

export interface WorkflowInput {
    id: string;
    label: string;
    accept: string; // e.g., "application/pdf"
    required: boolean;
}

export interface WorkflowConfig {
    id: WorkflowType;
    name: string;
    description: string;
    icon: string; // Icon name string, mapping handled in component
    inputs: WorkflowInput[];
}

export const WORKFLOWS: WorkflowConfig[] = [
    {
        id: 'CESSIONE_QUINTO',
        name: 'Analisi Cessione del Quinto',
        description: 'Check T.U.B. compliance and calculate refunds.',
        icon: 'Calculator',
        inputs: [
            { id: 'contract', label: 'Contratto', accept: 'application/pdf', required: true },
            { id: 'statement', label: 'Conteggio Estintivo', accept: 'application/pdf', required: true },
            { id: 'template', label: 'Template Diffida', accept: 'application/pdf', required: true }
        ]
    },
    {
        id: 'REDLINE_ADVISOR',
        name: 'Redline Advisor',
        description: 'AI Risk analysis and clause suggestions.',
        icon: 'PenTool', // Will need to import or map
        inputs: [
            { id: 'contract', label: 'Contratto (PDF)', accept: 'application/pdf', required: true }
        ]
    },
    {
        id: 'DEADLINE_EXTRACTOR',
        name: 'Deadline Extractor',
        description: 'Extract dates and generate Calendar events.',
        icon: 'Calendar', // Will need to import or map
        inputs: [
            { id: 'document', label: 'Atto / Notifica (PDF)', accept: 'application/pdf', required: true }
        ]
    },
    {
        id: 'CONTRACT_ANALYSIS',
        name: 'Analisi Contrattuale Generica',
        description: 'Generate summary, risk analysis, and key clause extraction.',
        icon: 'FileText',
        inputs: [
            { id: 'contract', label: 'Documento da Analizzare', accept: 'application/pdf', required: true }
        ]
    },
    {
        id: 'GDPR_CHECK',
        name: 'Verifica Compliance GDPR',
        description: 'Analyze documents for privacy regulation compliance.',
        icon: 'ShieldCheck',
        inputs: [
            { id: 'document', label: 'Policy / Informativa', accept: 'application/pdf', required: true }
        ]
    }
];
