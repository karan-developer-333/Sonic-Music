export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  categoryId: string;
  source?: 'gaana';
}

export interface Category {
  id: string;
  name: string;
}
