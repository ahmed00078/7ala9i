const { withProjectBuildGradle } = require('@expo/config-plugins');

// Fixes EAS cloud builds timing out when Gradle tries to resolve the dynamic
// version range org.bouncycastle:bcprov-jdk15to18:[1.81,1.82) from JitPack,
// which doesn't host BouncyCastle and always times out on maven-metadata.xml.
module.exports = function withBouncyCastleResolution(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const contents = cfg.modResults.contents;

    const marker = 'configurations.all {';
    if (contents.includes(marker)) {
      // Already applied — skip.
      return cfg;
    }

    const strategy = `
  configurations.all {
    resolutionStrategy {
      force 'org.bouncycastle:bcprov-jdk15to18:1.81'
      force 'org.bouncycastle:bcutil-jdk15to18:1.81'
    }
  }`;

    // Append inside the allprojects { repositories { ... } } block,
    // right before its closing brace.
    cfg.modResults.contents = contents.replace(
      /^(allprojects\s*\{[\s\S]*?^\})/m,
      (match) => match.slice(0, -1) + strategy + '\n}'
    );

    return cfg;
  });
};
