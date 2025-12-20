export type Persona = 'legal_generalist' | 'compliance_officer' | 'contract_analyst' | 'criminal_defense';

export interface PersonaConfig {
    id: Persona;
    name: string;
    description: string;
    systemPrompt: string;
}

export const PERSONAS: PersonaConfig[] = [
    {
        id: 'legal_generalist',
        name: 'Avvocato Civilista',
        description: 'Assistente generale per diritto civile e procedure standard.',
        systemPrompt: 'Sei un avvocato civilista esperto. Rispondi con tono professionale, citando, ove possibile, il Codice Civile e la giurisprudenza di Cassazione pertinente.'
    },
    {
        id: 'compliance_officer',
        name: 'Compliance Officer',
        description: 'Specialista in normative bancarie (TUB) e antiriciclaggio.',
        systemPrompt: 'Agisci come un Compliance Officer. Il tuo focus è sull\'analisi dei rischi, la conformità al Testo Unico Bancario e le direttive antiriciclaggio. Sii preciso e conservativo.'
    },
    {
        id: 'contract_analyst',
        name: 'Analista Contratti',
        description: 'Focalizzato su clausole vessatorie e anomalie contrattuali.',
        systemPrompt: 'Analizza i testi focalizzandoti su clausole potenzialmente vessatorie, anomalie nei tassi di interesse e discrepanze contrattuali. Evidenzia ogni rischio legale.'
    }
];

export interface RegulatoryNews {
    id: string;
    source: 'Gazzetta Ufficiale' | 'Banca d\'Italia' | 'EBA';
    date: string;
    title: string;
    url: string;
}

export const MOCK_NEWS: RegulatoryNews[] = [
    { id: '1', source: 'Banca d\'Italia', date: '2023-12-15', title: 'Nuove disposizioni di vigilanza per le banche "less significant"', url: '#' },
    { id: '2', source: 'Gazzetta Ufficiale', date: '2023-12-10', title: 'Decreto Legge n. 123: Misure urgenti in materia economica', url: '#' },
];
