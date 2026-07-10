export interface Link {
  id:          string
  url:         string
  title:       string
  favicon_url: string | null
  created_at:  string
  updated_at:  string
}

export interface LinkTag {
  id:         string
  link_id:    string
  name:       string
  created_at: string
}

export interface LinkWithTags extends Link {
  tags: string[]
}

export interface CreateLinkInput {
  url:         string
  title:       string
  favicon_url: string | null
  tags:        string[]
}

export type UpdateLinkInput = Partial<Pick<Link, "title">>
