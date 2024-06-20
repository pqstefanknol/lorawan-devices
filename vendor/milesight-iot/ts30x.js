/**
 * @product TS301 / TS302
 */
function decodeUplink(input) {
    var res = Decoder(input.bytes, input.fPort);
    if (res.error) {
        return { errors: [res.error] };
    }
    return { data: res };
}

function Decoder(bytes, port) {
    var decoded = {};
    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];

        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // TEMPERATURE(CHANNEL 1 SENSOR)
        else if (channel_id === 0x03 && channel_type === 0x67) {
            decoded.temperature_chn1 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // MAGNET STATUS(CHANNEL 1 SENSOR)
        else if (channel_id === 0x03 && channel_type === 0x00) {
            decoded.magnet_chn1 = bytes[i] === 0 ? "closed" : "opened";
            i += 1;
        }
        // TEMPERATURE(CHANNEL 2 SENSOR)
        else if (channel_id === 0x04 && channel_type === 0x67) {
            decoded.temperature_chn2 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // MAGNET STATUS(CHANNEL 2 SENSOR)
        else if (channel_id === 0x04 && channel_type === 0x00) {
            decoded.magnet_chn2 = bytes[i] === 0 ? "closed" : "opened";
            i += 1;
        }
        // TEMPERATURE(CHANNEL 1 SENSOR) ALARM
        else if (channel_id === 0x83 && channel_type === 0x67) {
            decoded.temperature_chn1 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            decoded.temperature_chn1_alarm = readAlarmType(bytes[i + 2]);
            i += 3;
        }
        // TEMPERATURE(CHANNEL 1 SENSOR) ALARM
        else if (channel_id === 0x93 && channel_type === 0xd7) {
            decoded.temperature_chn1 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            decoded.temperature_chn1_change = readInt16LE(bytes.slice(i + 2, i + 4)) / 100;
            decoded.temperature_chn1_alarm = readAlarmType(bytes[i + 4]);
            i += 5;
        }
        // TEMPERATURE(CHANNEL 2 SENSOR) ALARM
        else if (channel_id === 0x84 && channel_type === 0x67) {
            decoded.temperature_chn2 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            decoded.temperature_chn2_alarm = readAlarmType(bytes[i + 2]);
            i += 3;
        }
        // TEMPERATURE(CHANNEL 2 SENSOR) ALARM
        else if (channel_id === 0x94 && channel_type === 0xd7) {
            decoded.temperature_chn2 = readInt16LE(bytes.slice(i, i + 2)) / 10;
            decoded.temperature_chn2_change = readInt16LE(bytes.slice(i + 2, i + 4)) / 100;
            decoded.temperature_chn2_alarm = readAlarmType(bytes[i + 4]);
            i += 5;
        }
        // HISTORICAL DATA
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var timestamp = readUInt32LE(bytes.slice(i, i + 4));
            var mask = bytes[i + 4];
            i += 5;

            var data = { timestamp: timestamp };
            var chn1_mask = mask >>> 4;
            var chn2_mask = mask & 0x0f;

            i = decodeHistoricalData(bytes, i, data, chn1_mask, 'chn1');
            i = decodeHistoricalData(bytes, i, data, chn2_mask, 'chn2');

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        } else {
            break;
        }
    }
    return decoded;
}

function decodeHistoricalData(bytes, i, data, mask, channel) {
    switch (mask) {
        case 0x01:
            data[`temperature_${channel}`] = readInt16LE(bytes.slice(i, i + 2)) / 10;
            data[`temperature_${channel}_alarm`] = "threshold";
            break;
        case 0x02:
            data[`temperature_${channel}`] = readInt16LE(bytes.slice(i, i + 2)) / 10;
            data[`temperature_${channel}_alarm`] = "threshold release";
            break;
        case 0x03:
            data[`temperature_${channel}`] = readInt16LE(bytes.slice(i, i + 2)) / 10;
            data[`temperature_${channel}_alarm`] = "mutation";
            break;
        case 0x04:
            data[`temperature_${channel}`] = readInt16LE(bytes.slice(i, i + 2)) / 10;
            break;
        case 0x05:
            data[`magnet_${channel}`] = readInt16LE(bytes.slice(i, i + 2)) === 0 ? "closed" : "opened";
            data[`magnet_${channel}_alarm`] = "threshold";
            break;
        case 0x06:
            data[`magnet_${channel}`] = readInt16LE(bytes.slice(i, i + 2)) === 0 ? "closed" : "opened";
            break;
        default:
            break;
    }
    return i + 2;
}

/* ******************************************
 * bytes to number
 ********************************************/
function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}

function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return (value & 0xffffffff) >>> 0;
}

function readAlarmType(type) {
    switch (type) {
        case 0:
            return "threshold release";
        case 1:
            return "threshold";
        case 2:
            return "mutation";
        default:
            return "unknown";
    }
}
