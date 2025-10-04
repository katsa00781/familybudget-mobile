# React Native Vector Icons Fix Guide - iOS

## Probléma Leírása
A React Native/Expo alkalmazásban a vector ikonok nem jelennek meg iOS eszközön 7 napos development signing után.

## Fő Problémák és Megoldások

### 1. AppDelegate.swift Fájl Hibája

**Probléma:** Az AppDelegate.swift fájl XML/plist tartalmat tartalmazott Swift kód helyett.

**Megoldás:**
```swift
import UIKit
import React

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    
    let jsCodeLocation: URL

    #if DEBUG
        jsCodeLocation = RCTBundleURLProvider.sharedSettings()!.jsBundleURL(forBundleRoot: "index", fallbackResource:nil)
    #else
        jsCodeLocation = Bundle.main.url(forResource: "main", withExtension: "jsbundle")!
    #endif

    let rootView = RCTRootView(bundleURL: jsCodeLocation, moduleName: "CsaldiKltsgvets", initialProperties: nil, launchOptions: launchOptions)
    let rootViewController = UIViewController()
    rootViewController.view = rootView

    self.window = UIWindow(frame: UIScreen.main.bounds)
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()

    return true
  }

  // MARK: UISceneSession Lifecycle

  @available(iOS 13.0, *)
  func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
  }

  @available(iOS 13.0, *)
  func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
  }
}
```

### 2. Vector Icon Font Fájlok Hiányoznak az Xcode Projektből

**Probléma:** A font fájlok léteznek a Fonts mappában és az Info.plist-ben regisztrálva vannak, de nincsenek hozzáadva az Xcode projekt Resources build phase-éhez.

**Szükséges Font Fájlok:**
- AntDesign.ttf
- Entypo.ttf
- EvilIcons.ttf
- Feather.ttf
- FontAwesome.ttf
- FontAwesome5_Brands.ttf
- FontAwesome5_Regular.ttf
- FontAwesome5_Solid.ttf
- FontAwesome6_Brands.ttf
- FontAwesome6_Regular.ttf
- FontAwesome6_Solid.ttf
- Foundation.ttf
- Ionicons.ttf
- MaterialCommunityIcons.ttf
- MaterialIcons.ttf
- Octicons.ttf
- SimpleLineIcons.ttf
- Zocial.ttf

**Megoldás:**
1. Ellenőrizd, hogy a font fájlok léteznek a `Fonts/` mappában
2. Add hozzá őket az Xcode projekt Resources build phase-éhez a project.pbxproj fájl módosításával

### 3. Info.plist Konfiguráció

**Ellenőrizd:** Az Info.plist fájl tartalmazza a UIAppFonts szekciót:

```xml
<key>UIAppFonts</key>
<array>
    <string>AntDesign.ttf</string>
    <string>Entypo.ttf</string>
    <string>EvilIcons.ttf</string>
    <string>Feather.ttf</string>
    <string>FontAwesome.ttf</string>
    <string>FontAwesome5_Brands.ttf</string>
    <string>FontAwesome5_Regular.ttf</string>
    <string>FontAwesome5_Solid.ttf</string>
    <string>FontAwesome6_Brands.ttf</string>
    <string>FontAwesome6_Regular.ttf</string>
    <string>FontAwesome6_Solid.ttf</string>
    <string>Foundation.ttf</string>
    <string>Ionicons.ttf</string>
    <string>MaterialCommunityIcons.ttf</string>
    <string>MaterialIcons.ttf</string>
    <string>Octicons.ttf</string>
    <string>SimpleLineIcons.ttf</string>
    <string>Zocial.ttf</string>
</array>
```

## 7 Napos Development Build Ellenőrzés és Megoldás

### Build Konfiguráció Ellenőrzése

**1. Signing Beállítások:**
```bash
# Ellenőrizd a project.pbxproj fájlban:
CODE_SIGN_IDENTITY = "iPhone Developer"
DEVELOPMENT_TEAM = "YOUR_TEAM_ID"  # pl: 66TY7MP862
```

**2. Bundle Identifier:**
```bash
PRODUCT_BUNDLE_IDENTIFIER = "com.familybudget.mobile"
```

### Build Hibaelhárítás

**Gyakori Build Hibák:**

**1. React Native Worklets Hibák:**
```bash
# Megoldás:
cd ios
pod deintegrate
pod install
```

**2. Missing rnworklets Files:**
```bash
# Clean build és regenerálás:
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/*
pod install
```

**3. Metro Bundle Hiány:**
```bash
# Statikus bundle generálása:
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios
```

### Build és Deploy Lépések

**1. Előkészítés:**
```bash
# Töröld a cache-t
rm -rf build/
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Pods újratelepítése
cd ios
pod deintegrate
pod install
```

**2. Build Release Konfigurációval:**
```bash
xcodebuild -workspace CsaldiKltsgvets.xcworkspace \
           -scheme CsaldiKltsgvets \
           -configuration Release \
           -destination "id=YOUR_DEVICE_ID" \
           build
```

**3. Telepítés Eszközre:**
```bash
# Xcode-ban build és install, vagy:
xcrun devicectl device install app \
  --device YOUR_DEVICE_ID \
  PATH_TO_APP
```

## Ellenőrzési Lista

### Build Előtt:
- [ ] AppDelegate.swift helyes Swift kódot tartalmaz
- [ ] Összes vector icon font fájl létezik a Fonts/ mappában
- [ ] Font fájlok hozzá vannak adva az Xcode projekt Resources build phase-éhez
- [ ] Info.plist tartalmazza az UIAppFonts szekciót
- [ ] main.jsbundle létezik és naprakész
- [ ] Development team és signing beállítások helyesek

### Build Után:
- [ ] App sikeresen települt az eszközre
- [ ] Vector ikonok megjelennek az alkalmazásban
- [ ] Nincs "No script URL provided" hiba
- [ ] App működik Metro bundler nélkül

## Hibaelhárítás

### Ha még mindig nem jelennek meg az ikonok:

**1. Ellenőrizd a font regisztrációt:**
```bash
# App futása közben ellenőrizd a device logs-ot:
xcrun devicectl device log stream --device YOUR_DEVICE_ID
```

**2. Font fájlok bundle-ben való jelenléte:**
```bash
# Ellenőrizd, hogy a .app bundle tartalmazza a font fájlokat
unzip -l YOUR_APP.ipa | grep .ttf
```

**3. React Native font linking:**
```bash
# Ha Expo használsz, ellenőrizd az expo-font konfigurációt
npx expo install expo-font
```

### Debug Tippek:

**1. Simulator vs Device:**
- Szimulátoron gyakran működnek az ikonok, de eszközön nem
- Mindig eszközön teszteld a végső buildet

**2. Cache Problémák:**
- Töröld a teljes build cache-t
- Restart Xcode és eszköz

**3. Font Loading Ellenőrzés:**
```javascript
// React Native kódban ellenőrizd:
import { Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  iconTest: {
    fontFamily: 'AntDesign',
    fontSize: 20,
  },
});
```

## Megelőzés

**1. Font fájlok automatikus linking:**
Használj react-native.config.js fájlt:
```javascript
module.exports = {
  assets: ['./assets/fonts/'],
};
```

**2. Build script automatizálása:**
Hozz létre build scriptet a gyakori hibák elkerülésére.

**3. Verziókövetés:**
Commitold a project.pbxproj változásokat, ha font fájlokat adsz hozzá.

---

*Utolsó frissítés: 2025-10-01*  
*React Native verzió: 0.81.4*  
*Expo SDK verzió: 54*