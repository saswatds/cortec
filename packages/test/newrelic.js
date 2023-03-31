/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-var-requires */

const config = require('config');
const newRelicConfig = config.util.toObject(config.get('newrelic'));

/**
 * Get the app name for new relic
 */
function getAppName() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('./package.json'),
    env = process.env.NR_ENV || process.env.NODE_ENV,
    serviceName = pkg.name.replace(/^@.*\//, '');

  return `${serviceName}: ${env}`;
}

/**
 * Get the labels for new relic
 */
function getLabels() {
  if (!newRelicConfig.agent_enabled) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tags = require('/var/platform/env_tags.json');

    return {
      Domain: tags['resource-domain'] || null,
      Group: tags['resource-group'] || null,
    };
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      // eslint-disable-next-line no-console
      console.error(
        'Cannot fetch labels. File /var/platform/env_tags.json not found'
      );
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
    }

    return null;
  }
}

exports.config = {
  app_name: getAppName(),
  labels: getLabels(),

  /**
   * This setting controls distributed tracing.
   * Distributed tracing lets you see the path that a request takes through your
   * distributed system. Enabling distributed tracing changes the behavior of some
   * New Relic features, so carefully consult the transition guide before you enable
   * this feature: https://docs.newrelic.com/docs/transition-guide-distributed-tracing
   */
  distributed_tracing: {
    enabled: true,
  },

  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: true,

  // Enforce_backstop is responsible for grouping transactions where needed.
  // Due to a bug in NewRelic agent, this grouping is getting too severe and transactions
  // are getting grouped vaguely like GET/* and POST/*, making debugging difficult.
  // @todo Remove this option after NewRelic patches the grouping issue in the agent.
  // No ETA on the fix from NewRelic yet.
  enforce_backstop: false,

  slow_sql: {
    enabled: true,
  },

  transaction_tracer: {
    explain_threshold: 100,
    record_sql: 'obfuscated',
  },

  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.postmanToken',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*',
    ],
  },

  ...newRelicConfig,
};
