# FactorioLab

[![prod](https://github.com/factoriolab/factoriolab/actions/workflows/prod.yml/badge.svg)](https://github.com/factoriolab/factoriolab/actions/workflows/prod.yml) [![tests](https://github.com/factoriolab/factoriolab/actions/workflows/tests.yml/badge.svg)](https://github.com/factoriolab/factoriolab/actions/workflows/tests.yml)

This is the repository for the [FactorioLab](https://factoriolab.github.io) project, a tool for calculating resource and factory requirements for factory games.

| Supported games                                             |                                                           |                                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Factorio](https://factorio.com)                            | [Calculator](https://factoriolab.github.io/factorio)      | [Steam](https://store.steampowered.com/app/427520/Factorio/)              |
| Dyson Sphere Program                                        | [Calculator](https://factoriolab.github.io/dsp)           | [Steam](https://store.steampowered.com/app/1366540/Dyson_Sphere_Program/) |
| [Satisfactory](https://www.satisfactorygame.com/)           | [Calculator](https://factoriolab.github.io/satisfactory)  | [Steam](https://store.steampowered.com/app/526870/Satisfactory/)          |
| [Captain of Industry](https://www.captain-of-industry.com/) | [Calculator](https://factoriolab.github.io/coi)           | [Steam](https://store.steampowered.com/app/1594320/Captain_of_Industry/)  |
| [Techtonica](https://techtonicagame.com/)                   | [Calculator](https://factoriolab.github.io/techtonica)    | [Steam](https://store.steampowered.com/app/1457320/Techtonica/)           |
| Final Factory                                               | [Calculator](https://factoriolab.github.io/final-factory) | [Steam](https://store.steampowered.com/app/1383150/Final_Factory/)        |

This project is intended to build on the features of the Kirk McDonald [Factorio Calculator](https://kirkmcdonald.github.io) ([GitHub](https://github.com/KirkMcDonald/kirkmcdonald.github.io)). It is built from the ground up using Angular and TypeScript.

**To submit suggestions or issues,** please check out the [issues page](https://github.com/factoriolab/factoriolab/issues).

**To discuss the calculator,** join the [Discord](https://discord.gg/N4FKV687x2).

**If you love FactorioLab,** consider supporting it by [buying me a ☕](https://ko-fi.com/dcbroad3)!

## Running online

The calculator can be found at <https://factoriolab.github.io>.  
The staging environment, for testing pull requests, can be found at <https://factoriolab.github.io/staging>.

## Running locally

To run this project locally:

1. Install [NodeJS](https://nodejs.org/en/)
1. Install dependencies, using `npm ci`
1. Build and serve the project, using `npm start`
1. Open a browser at <http://localhost:4200>

The app will reload automatically if source code is changed.

## Running tests

To run the automated unit tests:

1. Install NodeJs, Angular CLI, and the dependencies as described above
2. Build and run the tests, using `npm test`
