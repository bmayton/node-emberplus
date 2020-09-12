"use strict";

class ElementType {
      /**
     * @returns {boolean}
     */
    isCommand() {
        return false;
    }
    /**
     * @returns {boolean}
     */
    isNode() {
        return false;
    }
    /**
     * @returns {boolean}
     */
    isMatrix() {
        return false;
    }
    /**
     * @returns {boolean}
     */
    isParameter() {
        return false;
    }
    /**
     * @returns {boolean}
     */
    isFunction() {
        return false;
    }
    /**
     * @returns {boolean}
     */
    isRoot() {
        return false;
    }
    /**
     * @returns {boolean}
     */
    isQualified() {
        return false;
    }
    /**
     * @returns {boolean}
     */
    isStream() {
        return false;
    }

    /**
     * @returns {boolean}
     */
    isTemplate() {
        return false;
    }
}

module.exports = ElementType;