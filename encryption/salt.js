/**
 * Created by Glenn on 1-4-2015.
 */
var characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
exports.getSalt = function getSalt(password, salt) {
    if ((password + salt).length >= 256) {
        return salt;
    }
    salt += characters.charAt(Math.floor(Math.random() * characters.length))
    return getSalt(password, salt)
};
