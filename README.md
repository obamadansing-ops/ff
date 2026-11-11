# Plazma Burst 2 – mobile touch patch

Adds a joystick, touch aim/shoot and configurable on-screen buttons to the HTML5 game.
**No game script is modified.** The patch feeds the game the same keyboard and mouse events a
desktop player would produce.

## 1. Install (it's an overlay, so the patch is small)

1. Unzip `Plazmaburst_2.zip` into a folder.
2. Put the contents of `sounds.zip` into **`flash_export/sounds/`** (the game looks for them there, *not* in `sounds/`).
   You should end up with 377 files in that folder.
3. Copy everything from this patch into the game folder, next to `index.html___.html`:
   `index.html`, `manifest.webmanifest`, `sw.js` and the `mobile/` folder.
4. Open **`index.html`** (not `index.html___.html`).

## 2. Run it on a phone

The game loads audio and images with `fetch`, so it must be served over HTTP(S). `file://` will not work.

- **Hosting (easiest):** upload the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, your own server)
  and open the URL on the phone. It must be **https** – the game itself redirects plain http to https unless the host is `localhost`.
  Don't put it under a path containing `/h5/` or `/game/`; the game treats those as special.
- **Testing from your PC over USB:** run `python3 -m http.server 8000` in the game folder, enable USB debugging, run
  `adb reverse tcp:8000 tcp:8000` and open `http://localhost:8000` in Chrome on the phone.
- **Add it to the home screen** (Android Chrome: menu → *Install app*; iOS Safari: Share → *Add to Home Screen*).
  It then runs fullscreen in landscape and works offline after it has been loaded twice
  (the first visit warms the cache, the second one stores everything).

## 3. Controls

| Input | Action |
| --- | --- |
| Joystick left / right | Move (A / D). Down ducks (S); this can be turned off. |
| Touch the screen | Move the cursor **and** shoot (hold to keep shooting, drag to aim). In menus a tap is a click. |
| Jump | W |
| Use / Grenade / Slow-mo / Ragdoll / Kinetic | E / G / Z / X / C |
| ‹‹ / ›› | Previous / next weapon (mouse-wheel events) |
| Face button | Quick swap (Q) |
| Menu | Esc – the game's own HUD "Menu" needs a held Ctrl key, so this replaces it |

Buttons are only visible during a level and hide automatically while a menu or dialog is open.

### Customizing
Tap the **⚙** (top-right) → **Edit layout**.

- Drag any button or the joystick to move it.
- Tap one to resize it or hide/show it.
- Hidden buttons (shown dashed with a **+**): Duck, Fire, Switch hero (Tab), Pause (P), Quick save (F5), Quick load (F9), "Don't pick up" (V).
- Settings: button opacity, joystick dead zone, vibration, keep-screen-awake, fullscreen, reset.
- Turn **Touch aims and shoots** off and touching only aims; a **Fire** button appears instead.

Everything is saved on the device (localStorage) and positions scale with the screen size.
On a desktop browser the layer is off unless you open the page with `?touch=1`.

## 4. Making an APK

I could not build an APK in my environment, so this is the route I'd use. **Capacitor** wraps the finished folder
as a real Android app with all assets bundled (works fully offline). You need Node.js and Android Studio.

```bash
mkdir pb2-app && cd pb2-app
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Plazma Burst 2" com.yourname.pb2mobile --web-dir www
mkdir www            # copy the finished game folder (with sounds + this patch) into ./www
npx cap add android
npx cap sync
npx cap open android # Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
```

Notes:
- Capacitor serves the app from `https://localhost`, which satisfies the game's host/https checks.
- Force landscape: in `android/app/src/main/AndroidManifest.xml` add `android:screenOrientation="sensorLandscape"` to the `<activity>`.
- Hide the system bars: add to `MainActivity.java` → `onCreate` (after `super.onCreate`):
  ```java
  androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
  androidx.core.view.WindowInsetsControllerCompat c =
      new androidx.core.view.WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
  c.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars());
  c.setSystemBarsBehavior(androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
  ```
- A debug APK installs directly. For the Play Store or sharing widely you need a signed release build.
- Alternatives: **PWABuilder** (turns the *hosted* site into an Android package) or Cordova. For iOS, Capacitor needs a Mac with Xcode.

## 5. Tips and limits

- The game defaults to **render resolution 2** (1600×800). On weaker phones lower it in the pause menu → *Graphics & Gameplay*.
- Weapon switching uses the game's "mouse wheel" option (on by default). If you turn it off in the game's settings, ‹‹ / ›› won't work.
- Typing (name prompt, chat) uses the phone's keyboard. Tapping a text box opens it.
- If you update the files on a host, bump `V` in `sw.js` so installed copies refresh.
- The patch reads a few of the game's internal variable names (listed at the top of `mobile/mobile.js`). If you swap in a different build of the game they may need updating.
- Tested in an emulated mobile Chromium with simulated multi-touch (menus, level 1, all controls, edit mode, offline cache). I could not test on a physical phone or on iOS.
