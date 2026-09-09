# Bundled font licences

`alegreya_sans_*.ttf` in `src/main/res/font/` are Alegreya Sans, by the Alegreya Sans Project
Authors (https://github.com/huertatipografica/Alegreya-Sans), used under the SIL Open Font
License 1.1 — full text in `OFL-AlegreyaSans.txt`.

The licence lives here rather than in `res/font/` because Android's resource compiler treats every
file in `res/font/` as a font resource and fails the build on anything else.

The iOS copy of the same licence is at `mobile/ios/OmenIOS/OmenIOS/Fonts/OFL.txt`.
