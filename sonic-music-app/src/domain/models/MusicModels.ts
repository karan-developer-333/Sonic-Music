export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  categoryId: string;
  source?: 'spotify' | 'jamendo';
}

export interface Category {
  id: string;
  name: string;
}
