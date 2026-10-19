import "react-native";

declare module "react-native" {
  interface PressableStateCallbackType {
    hovered?: boolean;
  }

  // Web-only: React Native Web passes these through to CSS, and the glass
  // popovers use them to blur the app content behind a menu.
  interface ViewStyle {
    backdropFilter?: string;
    WebkitBackdropFilter?: string;
  }
}
