const c = require("ansi-colors");

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
  ...[
    "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
    "NEXT_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_DEFAULT_REGION",
  ].map(function (key) {
    return {
      key,
      description: "Required to prevent invalid production URLs and routing.",
      productionOnly: true,
    };
  }),
];

function checkEnvVariables() {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return (
      !process.env[env.key] &&
      (!env.productionOnly || process.env.NODE_ENV === "production")
    );
  });

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    );

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`));
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`));
      }
    });

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    );

    process.exit(1);
  }

  if (process.env.NODE_ENV === "production") {
    const allowLocalhostBuild =
      process.env.ALLOW_LOCALHOST_PRODUCTION_BUILD === "true";
    const publicUrls = [
      "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
      "NEXT_PUBLIC_BASE_URL",
    ];
    const invalidUrls = publicUrls.filter(function (key) {
      try {
        const url = new URL(process.env[key]);
        const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
          url.hostname
        );
        return (
          (!allowLocalhostBuild && url.protocol !== "https:") ||
          (!allowLocalhostBuild && isLocalhost)
        );
      } catch {
        return true;
      }
    });

    if (invalidUrls.length > 0) {
      console.error(
        c.red.bold(
          `\n🚫 Error: Production requires public HTTPS URLs for ${invalidUrls.join(
            ", "
          )}.\n`
        )
      );
      process.exit(1);
    }
  }
}

module.exports = checkEnvVariables;
