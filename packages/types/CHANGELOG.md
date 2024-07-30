# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.13.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.12.0...@cortec/types@1.13.0) (2024-07-30)

### Features

- added support for trace-id generation and logging in polka ([aebf602](https://github.com/saswatds/cortec/commit/aebf602a1d4754b196497c863d62d97af5c98045))
- fix all dependency issues ([3e5041e](https://github.com/saswatds/cortec/commit/3e5041e97d6533fc2783718674853faadd4f4ae6))

## [1.12.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.11.1...@cortec/types@1.12.0) (2023-08-22)

### Features

- expose require on IContext ([5867e42](https://github.com/saswatds/cortec/commit/5867e42ffe97832e3e33f2f27bb13e3775474a79))

## [1.11.1](https://github.com/saswatds/cortec/compare/@cortec/types@1.11.0...@cortec/types@1.11.1) (2023-07-13)

### Bug Fixes

- handle graceful exit when module load fails ([a2521f2](https://github.com/saswatds/cortec/commit/a2521f29cc2ea8a21b0a30be9a15971bf898fc89))

## [1.11.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.10.0...@cortec/types@1.11.0) (2023-06-30)

### Features

- add ability to silent logs ([00e66e6](https://github.com/saswatds/cortec/commit/00e66e6196c1ffd90ff0c196fdcf1270cdee961f))

## [1.10.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.9.0...@cortec/types@1.10.0) (2023-06-30)

### Features

- replace tasuku with signale ([4ab8a57](https://github.com/saswatds/cortec/commit/4ab8a5792e065e9174eff7cda3e0a2596aa2141b))

## [1.9.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.8.0...@cortec/types@1.9.0) (2023-06-09)

### Features

- moved polka related types into polka repo ([c6afbe2](https://github.com/saswatds/cortec/commit/c6afbe275e8c487ab9dc2c582a7b6ea222b34553))

## [1.8.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.7.0...@cortec/types@1.8.0) (2023-06-01)

### Features

- added support for noMatch handler in polka ([8dcfe1a](https://github.com/saswatds/cortec/commit/8dcfe1a1e7557aa61bed656f56bc0ede31be1740))

## [1.7.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.6.0...@cortec/types@1.7.0) (2023-04-07)

### Features

- added support for rate-limiting ([22eccff](https://github.com/saswatds/cortec/commit/22eccff1f0496c9e6776bc610e8beb4d9b81679a))

### Bug Fixes

- fix type for rate-limit function ([3de68c3](https://github.com/saswatds/cortec/commit/3de68c3e16913a469e49dd89da64e1208b2fac36))

## [1.6.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.5.0...@cortec/types@1.6.0) (2023-04-07)

### Features

- add all to IApp interface ([7f07f41](https://github.com/saswatds/cortec/commit/7f07f414bb18ac0d7740b6dc2d26d632526b81f7))

## [1.5.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.4.0...@cortec/types@1.5.0) (2023-04-06)

### Features

- improve interface to build request context ([5cb7a2a](https://github.com/saswatds/cortec/commit/5cb7a2a1becb5896cd548ecee458126625a6763d))

## [1.4.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.3.0...@cortec/types@1.4.0) (2023-03-31)

### Features

- add private test package to check the implementation ([992ff20](https://github.com/saswatds/cortec/commit/992ff20ca4c3b7ce2d154323a6a9e763c2214c22))
- added basic framework polka ([e8663cb](https://github.com/saswatds/cortec/commit/e8663cb6b0103c2c530539b96c3fc959c14860e3))
- added support for request context ([e6778dc](https://github.com/saswatds/cortec/commit/e6778dcb1ca4780e5ba3536905eccf3f79225a16))
- build interface for controller ([70fdb40](https://github.com/saswatds/cortec/commit/70fdb40571b8bf775b59bf4fe37707abd50ffac9))
- fix git link ([1bd8f6a](https://github.com/saswatds/cortec/commit/1bd8f6a6789555c02abaaa58b58d82c6a474f23c))
- fix interface for defining routes ([1e6f340](https://github.com/saswatds/cortec/commit/1e6f340aec346559189d9b72f36c8a95d549d6d9))
- handle validation using zod ([eeb5c8f](https://github.com/saswatds/cortec/commit/eeb5c8fa84a8dc09a46028d7214731f4a1692742))
- implemented the core module ([1e80ced](https://github.com/saswatds/cortec/commit/1e80cedb57b33492252018de6006af587124f3d8))
- properly format error message ([7303c72](https://github.com/saswatds/cortec/commit/7303c72ad83821dbdbb8961e447548cb6d2b5b4f))
- remove unused types ([abe9715](https://github.com/saswatds/cortec/commit/abe971596e4c13bc24fe43f71068505eeaff1fad))
- simplify module loading ([4095f1d](https://github.com/saswatds/cortec/commit/4095f1d20fde56abef6c08613defa6bb2f9e2f96))

## 1.3.0 (2023-03-23)

### Features

- add sentry module ([a985955](https://github.com/saswatds/cortec/commit/a9859556e0578af9f179256b1dac45cc9c0bd197))
- added config module ([bf44502](https://github.com/saswatds/cortec/commit/bf445029dfa028cb88fe00ebc0665460ea7cd623))
- added publish config to all projects ([dfb4b69](https://github.com/saswatds/cortec/commit/dfb4b69645b860b6686792d7a4272700686fd544))
- replace name cortes with cortec ([dea0553](https://github.com/saswatds/cortec/commit/dea055356354609a61c9900293a68c07cb71ba54))
- used existing load implementation ([47a8935](https://github.com/saswatds/cortec/commit/47a893576e6ddaddcf940dfb25dc20e42a718b5b))

## [1.2.0](https://github.com/saswatds/cortec/compare/@cortec/types@1.1.0...@cortec/types@1.2.0) (2023-03-23)

### Features

- added publish config to all projects ([dfb4b69](https://github.com/saswatds/cortec/commit/dfb4b69645b860b6686792d7a4272700686fd544))

## 1.1.0 (2023-03-23)

### Features

- add sentry module ([a985955](https://github.com/saswatds/cortec/commit/a9859556e0578af9f179256b1dac45cc9c0bd197))
- added config module ([bf44502](https://github.com/saswatds/cortec/commit/bf445029dfa028cb88fe00ebc0665460ea7cd623))
- used existing load implementation ([47a8935](https://github.com/saswatds/cortec/commit/47a893576e6ddaddcf940dfb25dc20e42a718b5b))

# Change Log
