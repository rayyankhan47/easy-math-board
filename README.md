# Rayyan's Easy Math Board

I made this because I love to do math while watching videos on my phone in the background. It's like my version of fidgeting lmao.

I recently sold my iPad, and also it's kind of uncomfortable when having to write on a notebook laying down on my bed while watching
videos so I thought it'd be cool to have my own personalized "math notebook" but on my computer, and have it be particularly easy and
unannoying to use.

Have fun
## Running it

```bash
npm install
npm run dev
```

`npm install` also pulls down the Python runtime (SymPy and NetworkX, ~21MB)
into `public/pyodide`, which isn't in the repo. `npm run pyodide` redoes that by
hand if it ever goes missing.
