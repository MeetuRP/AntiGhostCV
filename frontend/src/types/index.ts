export interface Resume {
    id: string;
    user_id: string;
    file_path: string;
    extracted_data: ExtractedData;
    uploaded_at: string;
}

export interface ExtractedData {
    name?: string;
    email?: string;
    phone?: string;
    skills: string[];
    experience: string[];
    education: string[];
    projects: string[];
    certifications: string[];
    links: {
        github?: string;
        linkedin?: string;
        website?: string;
        email?: string;
    };
    suggested_roles: string[];
}

export interface AnalysisResult {
    id: string;
    user_id: string;
    resume_id: string;
    job_title: string;
    job_description: string;
    ats_score: number;
    skills_matched: string[];
    missing_skills: string[];
    summary: string;
    suggestions: string[];
    created_at: string;
}

// Adapted from Hirelytics Review UI needs
export interface UnifiedFeedback {
    overallScore: number;
    ATS: {
        score: number;
        tips: { type: 'good' | 'improve', tip: string }[];
    };
    toneAndStyle: { score: number, tips: any[] };
    content: { score: number, tips: any[] };
    structure: { score: number, tips: any[] };
    skills: { score: number, tips: any[] };
}

export interface SocialLinks {
    github?: string;
    linkedin?: string;
    website?: string;
}

export interface JobPreferences {
    desired_roles: string[];
    locations: string[];
    min_salary?: number;
    remote_preferred: boolean;
}

export interface PlanLimits {
    jd_scans: number;
    fix_it_uses: number;
    cover_letters: number;
}

export interface UserUsage {
    resume_evaluations: number;
    jd_scans_used: number;
    fix_it_used: number;
    cover_letters_generated: number;
}


export interface AIUsage {
    total_api_calls: number;
    total_input_tokens: number;
    total_output_tokens: number;
    estimated_cost: number;
}

export interface User {
    id: string;
    google_id: string;
    name: string;
    email: string;
    profile_image?: string;
    bio?: string;
    is_admin?: boolean;
    social_links: SocialLinks;
    job_preferences: JobPreferences;
    last_parsed_profile?: ExtractedData;
    resume_id?: string;
    plan: string;
    plan_start?: string;
    plan_expiry?: string;
    plan_limits: PlanLimits;
    usage: UserUsage;
    ai_usage?: AIUsage;
    target_role?: string;
    experience_level?: string;
    onboarding_completed: boolean;
}

export interface EvaluationSummary {
    id: string;
    resume_id: string;
    resume_name: string;
    job_title: string;
    ats_score: number;
    summary: string;
    created_at: string;
}
