'use strict';

const _ = require('lodash');
const URI = require('urijs');
const webdriverio = require('@gemini-testing/webdriverio');

module.exports = class Browser {
    static create(config, id) {
        return new this(config, id);
    }

    constructor(config, id) {
        this.id = id;

        this._config = config.forBrowser(this.id);
        this._debug = config.system.debug;

        this._state = {
            isBroken: false
        };

        this._session = this._createSession();

        this._addCommands();
    }

    setHttpTimeout(timeout) {
        if (timeout === null) {
            timeout = this._config.httpTimeout;
        }

        this._session.extendOptions({connectionRetryTimeout: timeout});
    }

    restoreHttpTimeout() {
        this.setHttpTimeout(this._config.httpTimeout);
    }

    _createSession() {
        const config = this._config;
        const gridUri = new URI(config.gridUrl);

        return webdriverio.remote({
            host: this._getGridHost(gridUri),
            port: gridUri.port(),
            path: gridUri.path(),
            desiredCapabilities: config.desiredCapabilities,
            waitforTimeout: config.waitTimeout,
            logLevel: this._debug ? 'verbose' : 'error',
            coloredLogs: true,
            screenshotPath: config.screenshotPath,
            connectionRetryTimeout: config.httpTimeout,
            connectionRetryCount: 0, // hermione has its own advanced retries
            baseUrl: config.baseUrl
        });
    }

    _getGridHost(url) {
        return new URI({
            username: url.username(),
            password: url.password(),
            hostname: url.hostname()
        }).toString().slice(2); // URIjs leaves `//` prefix, removing it
    }

    _addCommands() {
        this._addExtendOptionsMethod(this._session);
    }

    _addExtendOptionsMethod(session) {
        session.addCommand('extendOptions', (opts) => {
            _.extend(session.requestHandler.defaultOptions, opts);
        });
    }

    applyState(state) {
        _.extend(this._state, state);
    }

    get publicAPI() {
        return this._session; // exposing webdriver API as is
    }

    get sessionId() {
        return this.publicAPI.requestHandler.sessionID;
    }

    set sessionId(id) {
        this.publicAPI.requestHandler.sessionID = id;
    }

    get config() {
        return this._config;
    }

    get state() {
        return this._state;
    }
};
