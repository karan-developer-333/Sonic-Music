import * as React from 'react';
import { ComponentType } from 'react';

declare module 'react-native' {
  export const View: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const Image: ComponentType<any>;
  export const TextInput: ComponentType<any>;
  export const ScrollView: ComponentType<any>;
  export const FlatList: ComponentType<any>;
  export const TouchableOpacity: ComponentType<any>;
  export const TouchableHighlight: ComponentType<any>;
  export const TouchableWithoutFeedback: ComponentType<any>;
  export const ActivityIndicator: ComponentType<any>;
  export const KeyboardAvoidingView: ComponentType<any>;
  export const RefreshControl: ComponentType<any>;
  export const Pressable: ComponentType<any>;
  export const Modal: ComponentType<any>;
  export const Alert: any;
  export const Animated: any;
  export const Dimensions: any;
  export const Platform: any;
  export const StyleSheet: any;
  export const LogBox: any;
  export const Vibration: any;
  export const Linking: any;
  export const PixelRatio: any;
  export const LayoutAnimation: any;
  export const useWindowDimensions: any;
  export const Keyboard: any;
  export const Pressable: ComponentType<any>;
}