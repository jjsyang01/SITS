class Logger {
  /**
   * @param {import("./types").Context} context
   */
  constructor(context) {
    this.context = context;
  }

  /**
   * @param {any[]} args
   */
  info(...args) {
    this.context.log.info("[ INFO ]", ...args);
  }

  /**
   * @param {any[]} args
   */
  warning(...args) {
    this.context.log.warn("[ WARN ]", ...args);
  }

  /**
   * @param {any[]} args
   */
  error(...args) {
    this.context.log.error("[ ERROR ]", ...args);
  }
}

module.exports = {
  Logger,
};
