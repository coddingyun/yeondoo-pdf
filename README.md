# yeondoo-pdf

## How to Start
### Build

Clone the repository:

```
git clone https://github.com/coddingyun/yeondoo-pdf.git --recursive
```

With Node 18+, run the following:

```
NODE_OPTIONS=--openssl-legacy-provider npm i
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

This will produce `dev`, `web` and `zotero` builds in the `build/` directory.

### Development
First, you need to run [YEONDOO-fe](https://github.com/YEONDOO-swm/YEONDOO-fe)

Then, run `npm start` and open http://localhost:3000/dev/reader.html.

## License
yeondoo-pdf is under GNU AFFERO GENERAL PUBLIC LICENSE. See the [LICENSE](https://github.com/coddingyun/yeondoo-pdf/blob/master/LICENSE) file for more info.

