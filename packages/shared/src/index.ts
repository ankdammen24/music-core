export type Role = 'listener' | 'artist' | 'admin';

export interface JwtUser {
  id: string;
  email: string;
  role: Role;
}

export interface TrackSummary {
  id: string;
  title: string;
  artistName: string;
  genre?: string;
  coverUrl?: string;
}
