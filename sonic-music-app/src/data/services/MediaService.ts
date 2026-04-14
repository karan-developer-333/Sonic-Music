import { Platform } from 'react-native';
import { Song } from '../../domain/models/MusicModels';

let MediaLibrary: any = null;

if (Platform.OS !== 'web') {
  MediaLibrary = require('expo-media-library');
}

export class MediaService {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
    
    if (status === MediaLibrary.PermissionStatus.GRANTED) return true;
    
    if (status === MediaLibrary.PermissionStatus.DENIED && canAskAgain) {
      const { status: retryStatus } = await MediaLibrary.requestPermissionsAsync();
      return retryStatus === MediaLibrary.PermissionStatus.GRANTED;
    }
    
    return false;
  }

  static async getLocalSongs(): Promise<Song[]> {
    if (Platform.OS === 'web') return [];

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return [];

    const assets = await MediaLibrary.getAssetsAsync({
      mediaType: 'audio',
    });

    return assets.assets.map((asset: any) => ({
      id: asset.id,
      title: asset.filename.split('.').slice(0, -1).join('.') || asset.filename,
      artist: 'Unknown Artist',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop',
      audioUrl: asset.uri,
      duration: Math.floor(asset.duration),
      categoryId: 'local',
    }));
  }
}
