const forge = require('node-forge');

exports.HandshakeRequest = class {
    constructor(token) {
        this.typeName = 'HandshakeRequest'
        this.token = token
    }
}

exports.HandshakeResponse = class {
    constructor(id, error) {
        this.typeName = 'HandshakeResponse'
        this.id = id
        this.error = error
    }
}

exports.Message = class {
    constructor(sourceId, targetId, contentType, contentJson) {
        this.typeName = 'Message'
        this.sourceId = sourceId
        this.targetId = targetId
        this.contentType = contentType
        this.contentJson = contentJson
    }
}

exports.sha256 = function sha256(content) {
    const md = forge.md.sha256.create();
    md.update(content);
    return md.digest().toHex();
}