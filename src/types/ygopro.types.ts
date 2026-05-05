export interface YgoProCardImage {
  id: number;
  image_url?: string;
  image_url_small?: string;
  image_url_cropped?: string;
}

export interface YgoProCard {
  id: number;
  name: string;
  name_en?: string;
  type: string;
  humanReadableCardType?: string;
  frameType: string;
  desc: string;
  monster_desc?: string;
  pend_desc?: string;
  race?: string;
  atk?: number;
  def?: number;
  level?: number;
  attribute?: string;
  typeline?: string[];
  card_images?: YgoProCardImage[];
  linkval?: number;
  linkmarkers?: string[];
  scale?: number;
}

export interface YgoProResponse {
  data?: YgoProCard[];
  error?: string;
}
