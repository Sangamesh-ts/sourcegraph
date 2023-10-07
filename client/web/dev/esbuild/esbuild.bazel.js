// This file is only used by Bazel builds.

const { BUILD_OPTIONS } = require('./build.js')

module.exports = {
  // TODO(sqs): does not support Cody app build
  ...BUILD_OPTIONS,

  // Unset configuration properties that are provided by Bazel.
  entryPoints: undefined,
  bundle: undefined,
  outdir: undefined,
  sourcemap: undefined,
  splitting: undefined,
}
