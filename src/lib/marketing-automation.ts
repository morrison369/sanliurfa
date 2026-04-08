/**
 * Marketing Automation Library
 * Campaign management, segmentation, and automation workflows
 */
import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function createEmailCampaign(userId: string, campaignData: any): Promise<any | null> {
  try {
    const result = await insert('email_campaigns', {
      campaign_name: campaignData.campaign_name,
      campaign_type: campaignData.campaign_type || 'promotional',
      created_by_user_id: userId,
      subject_line: campaignData.subject_line,
      preview_text: campaignData.preview_text,
      html_content: campaignData.html_content,
      plain_text_content: campaignData.plain_text_content,
      from_name: campaignData.from_name,
      from_email: campaignData.from_email,
      reply_to_email: campaignData.reply_to_email,
      status: 'draft'
    });

    await deleteCache('sanliurfa:campaigns:*');
    logger.info('Email campaign created', { campaignId: result.id, userId });
    return result;
  } catch (error) {
    logger.error('Failed to create campaign', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getCampaignById(campaignId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:campaign:${campaignId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const campaign = await queryOne(
      'SELECT * FROM email_campaigns WHERE id = $1 AND deleted_at IS NULL',
      [campaignId]
    );

    if (campaign) {
      await setCache(cacheKey, JSON.stringify(campaign), 1800);
    }

    return campaign || null;
  } catch (error) {
    logger.error('Failed to get campaign', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function createUserSegment(userId: string, segmentData: any): Promise<any | null> {
  try {
    const segment = await insert('user_segments', {
      segment_name: segmentData.segment_name,
      segment_key: segmentData.segment_key,
      description: segmentData.description,
      segment_rules: segmentData.segment_rules || {},
      created_by_user_id: userId,
      is_dynamic: segmentData.is_dynamic !== false,
      is_active: true
    });

    await deleteCache('sanliurfa:segments:*');
    logger.info('User segment created', { segmentId: segment.id, userId });
    return segment;
  } catch (error) {
    logger.error('Failed to create segment', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getSegmentById(segmentId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:segment:${segmentId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const segment = await queryOne(
      'SELECT * FROM user_segments WHERE id = $1',
      [segmentId]
    );

    if (segment) {
      await setCache(cacheKey, JSON.stringify(segment), 3600);
    }

    return segment || null;
  } catch (error) {
    logger.error('Failed to get segment', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function addUserToSegment(segmentId: string, userId: string): Promise<boolean> {
  try {
    await insert('segment_members', {
      segment_id: segmentId,
      user_id: userId
    });

    // Update member count
    const count = await queryOne(
      'SELECT COUNT(*) as count FROM segment_members WHERE segment_id = $1',
      [segmentId]
    );

    await update('user_segments', { id: segmentId }, {
      member_count: parseInt(count?.count || '0')
    });

    await deleteCache(`sanliurfa:segment:${segmentId}`);
    return true;
  } catch (error) {
    logger.error('Failed to add user to segment', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getUserCampaigns(userId: string, limit: number = 20): Promise<any[]> {
  try {
    const campaigns = await queryMany(`
      SELECT
        id,
        campaign_name,
        campaign_type,
        status,
        total_recipients,
        sent_count,
        open_count,
        click_count,
        scheduled_at,
        sent_at,
        created_at
      FROM email_campaigns
      WHERE created_by_user_id = $1
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return campaigns;
  } catch (error) {
    logger.error('Failed to get user campaigns', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function scheduleCampaign(campaignId: string, scheduleTime: Date): Promise<boolean> {
  try {
    await update('email_campaigns', { id: campaignId }, {
      status: 'scheduled',
      scheduled_at: scheduleTime
    });

    await deleteCache(`sanliurfa:campaign:${campaignId}`);
    logger.info('Campaign scheduled', { campaignId, scheduleTime });
    return true;
  } catch (error) {
    logger.error('Failed to schedule campaign', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getCampaignMetrics(campaignId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:campaign:metrics:${campaignId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await queryOne(`
      SELECT
        SUM(sent) as total_sent,
        SUM(opened) as total_opened,
        SUM(clicked) as total_clicked,
        SUM(bounced) as total_bounced,
        SUM(unsubscribed) as total_unsubscribed,
        SUM(converted) as total_converted,
        ROUND(SUM(opened)::float / NULLIF(SUM(sent), 0) * 100, 2) as open_rate,
        ROUND(SUM(clicked)::float / NULLIF(SUM(opened), 0) * 100, 2) as click_rate,
        ROUND(SUM(converted)::float / NULLIF(SUM(sent), 0) * 100, 2) as conversion_rate
      FROM campaign_metrics
      WHERE campaign_id = $1
    `, [campaignId]);

    if (metrics) {
      await setCache(cacheKey, JSON.stringify(metrics), 1800);
    }

    return metrics || null;
  } catch (error) {
    logger.error('Failed to get campaign metrics', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function createAutomationWorkflow(userId: string, workflowData: any): Promise<any | null> {
  try {
    const workflow = await insert('automation_workflows', {
      workflow_name: workflowData.workflow_name,
      workflow_key: workflowData.workflow_key,
      description: workflowData.description,
      trigger_type: workflowData.trigger_type,
      trigger_conditions: workflowData.trigger_conditions || {},
      created_by_user_id: userId,
      is_active: true
    });

    await deleteCache('sanliurfa:workflows:*');
    logger.info('Automation workflow created', { workflowId: workflow.id, userId });
    return workflow;
  } catch (error) {
    logger.error('Failed to create workflow', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function addWorkflowStep(workflowId: string, stepData: any): Promise<any | null> {
  try {
    const step = await insert('workflow_steps', {
      workflow_id: workflowId,
      step_order: stepData.step_order,
      action_type: stepData.action_type,
      action_config: stepData.action_config || {},
      delay_seconds: stepData.delay_seconds || 0,
      delay_unit: stepData.delay_unit,
      is_active: true
    });

    await deleteCache(`sanliurfa:workflow:${workflowId}`);
    return step;
  } catch (error) {
    logger.error('Failed to add workflow step', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function createDripCampaign(userId: string, campaignData: any): Promise<any | null> {
  try {
    const campaign = await insert('drip_campaigns', {
      campaign_name: campaignData.campaign_name,
      description: campaignData.description,
      created_by_user_id: userId,
      trigger_event: campaignData.trigger_event,
      target_segment_id: campaignData.target_segment_id,
      total_emails: campaignData.total_emails || 0,
      is_active: true
    });

    await deleteCache('sanliurfa:drip_campaigns:*');
    logger.info('Drip campaign created', { campaignId: campaign.id, userId });
    return campaign;
  } catch (error) {
    logger.error('Failed to create drip campaign', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function setEmailPreferences(userId: string, preferences: any): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id FROM email_subscriber_preferences WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      await update(
        'email_subscriber_preferences',
        { user_id: userId },
        {
          ...preferences,
          last_updated_at: new Date()
        }
      );
    } else {
      await insert('email_subscriber_preferences', {
        user_id: userId,
        ...preferences
      });
    }

    await deleteCache(`sanliurfa:email:prefs:${userId}`);
    return true;
  } catch (error) {
    logger.error('Failed to set email preferences', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getEmailPreferences(userId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:email:prefs:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const prefs = await queryOne(
      'SELECT * FROM email_subscriber_preferences WHERE user_id = $1',
      [userId]
    );

    if (prefs) {
      await setCache(cacheKey, JSON.stringify(prefs), 3600);
    }

    return prefs || null;
  } catch (error) {
    logger.error('Failed to get email preferences', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
