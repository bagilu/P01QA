# P01 MyKahoot V26.2 – Image Question Support

## Changes
- Existing text questions remain fully compatible.
- `TblP01Question.Q` can now contain limited safe HTML for question images.
- Supported tags: `<br>`, `<img>`, `<b>`, `<strong>`, `<i>`, `<em>`.
- Image source is restricted to repository-local `images/questions/` assets.
- Added responsive image CSS for desktop/mobile quiz screens.
- Added persistent `images/questions/` directory convention.

## Recommended Q value
```html
請問紅色的國家是？<br><img src="images/questions/Q0001.jpg" alt="題目圖片">
```

## Deployment
No SQL or Edge Function changes are required for V26.2.
Upload the files in `GitHub_Deploy_Only/`, but do NOT delete existing files already stored under `images/questions/`.
Keep the existing working `config.js` in the repository root.
