# FactorioLab

![build](https://github.com/factoriolab/factorio-lab/workflows/build/badge.svg) ![tests](https://github.com/factoriolab/factorio-lab/workflows/tests/badge.svg) [![codecov](https://codecov.io/gh/factoriolab/factorio-lab/branch/master/graph/badge.svg)](https://codecov.io/gh/factoriolab/factorio-lab) [![Known Vulnerabilities](https://snyk.io/test/github/factoriolab/factorio-lab/badge.svg?targetFile=package.json)](https://snyk.io/test/github/factoriolab/factorio-lab?targetFile=package.json)

This is the repository for the [FactorioLab](https://factoriolab.github.io) project, a tool for calculating resource and factory requirements for the games [Factorio](https://factorio.com), [Dyson Sphere Program](https://store.steampowered.com/app/1366540/Dyson_Sphere_Program/), and [Satisfactory](https://www.satisfactorygame.com/).  
This project is intended to build on the features of the Kirk McDonald [Factorio Calculator](https://kirkmcdonald.github.io) ([GitHub](https://github.com/KirkMcDonald/kirkmcdonald.github.io)). It is built from the ground up using Angular, Redux, and Typescript.

**For instructions on how to use this tool,** check out the [wiki](https://github.com/factoriolab/factorio-lab/wiki).

**To submit suggestions or issues,** please check out the [issues page](https://github.com/factoriolab/factorio-lab/issues).

**To discuss the calculator,** join the [Discord](https://discord.gg/N4FKV687x2).

**If you love Factorio Lab,** consider supporting it by [buying me a ☕](https://ko-fi.com/dcbroad3)!

## Running online

The calculator can be found at [https://factoriolab.github.io](https://factoriolab.github.io).  
The Dyson Sphere Program calculator can opened directly using the url [https://factoriolab.github.io/dsp](https://factoriolab.github.io/dsp).  
The staging environment, for testing pull requests, can be found at [https://factoriolab.github.io/staging](https://factoriolab.github.io/staging).

## Running locally

To run this project locally:

1. Install [NodeJS](https://nodejs.org/en/)
1. Install Angular CLI, using `npm install -g @angular/cli`
1. Install dependencies, using `npm ci`
1. Build and serve the project, using `npm start`
1. Open a browser at `http://localhost:4200`

The app will reload automatically if source code is changed.

## Running tests

To run the automated unit tests:

1. Install NodeJs and Angular CLI as described above
2. Build and run the tests, using `npm test`

Currently, this project does not include any end-to-end tests, though the Angular CLI automatically includes a skeleton in the [e2e](./e2e) folder.
