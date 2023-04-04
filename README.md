# weasyprint-cdk

## 前提

次のソフトウェアはインストールしておく必要があります。

- Docker
- Node

## 設定ファイルなど上書き

サブモジュールである`cloud-print-utils`のファイルを一部上書きします。

```bash
$ rsync -a overwrite/ cloud-print-utils/
```

## デプロイ

初回はブートストラップを実行します。

```bash
$ npm install
$ npx cdk bootstrap
```

普通にデプロイすればOKです。

```bash
$ npx cdk deploy
```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
