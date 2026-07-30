export interface Track {
  id: string
  campaign_id: string
  title: string
  category: string
  source_type: 'youtube' | 'file'
  url: string            // URL YouTube oppure path nel bucket campaign-audio
  order_index?: number
  created_at?: string
}
