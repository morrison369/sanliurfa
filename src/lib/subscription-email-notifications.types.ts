export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body?: string;
  variables?: Record<string, any>;
  category?: string;
  is_active: boolean;
}

export interface EmailQueueItem {
  id: string;
  user_id: string;
  to_email: string;
  template_name: string;
  template_variables: Record<string, any>;
  priority: number;
  status: 'pending' | 'sent' | 'failed';
  scheduled_at?: Date;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  created_at: Date;
}
