// Chart Objects
class Chart {
    constructor(json) {
        const version = json["formatVersion"]
        this.judgeLines = [];
        this.offset = json["offset"];
        this.noteCount = 0;
        for (const judgeLine of json["judgeLineList"]) {
            this.judgeLines.push(new JudgeLine(version, this, judgeLine));
        }
    }
}

class JudgeLine {
    constructor(version, chart, json) {
        this.bpm = json["bpm"];
        this.T = 1.875 / this.bpm;

        this.notesAbove = [];
        this.nowNAIndex = 0;
        for (const note of json["notesAbove"]) {
            chart.noteCount++;
            this.notesAbove.push(new Note(note));
        }
        this.nowNBIndex = 0;
        this.notesBelow = [];
        for (const note of json["notesBelow"]) {
            chart.noteCount++;
            this.notesBelow.push(new Note(note));
        }
        chart.noteCount += this.notesAbove.length + this.notesBelow.length;

        this.speedEvents = [];
        this.nowSEIndex = 0;
        for (const event of json["speedEvents"]) {
            this.speedEvents.push(new SpeedEvent(this, event));
        }

        this.disappearEvents = [];
        this.nowDEIndex = 0;
        for (const event of json["judgeLineDisappearEvents"]) {
            this.disappearEvents.push(new DisappearEvent(event));
        }

        this.moveEvents = [];
        this.nowMEIndex = 0;
        for (const event of json["judgeLineMoveEvents"]) {
            this.moveEvents.push(new MoveEvent(version, event));
        }

        this.rotateEvents = [];
        this.nowREIndex = 0;
        for (const event of json["judgeLineRotateEvents"]) {
            this.rotateEvents.push(new RotateEvent(event));
        }
    }
}

class Note {
    constructor(json) {
        this.type = json["type"];
        this.time = json["time"];
        this.positionX = json["positionX"];
        try {
            this.holdTime = json["holdTime"];
        } catch (e) {
            this.holdTime = 0;
        }
        this.speedMultiper = json["speed"];
        this.floorPosition = json["floorPosition"];
        this.fs = this.speedMultiper * this.floorPosition;
        this.hitted = false;
    }
}

let n = 0;

class SpeedEvent {
    constructor(line, json) {
        this.startTime = json["startTime"];
        this.endTime = json["endTime"];
        this.speed = json["value"];
        if (line.speedEvents.length > 0) {
            const lastEvent = line.speedEvents[line.speedEvents.length - 1];
            this.floorPosition = lastEvent.floorPosition + lastEvent.speed * (this.startTime - lastEvent.startTime) * line.T;

        } else {
            this.floorPosition = 0;
        }
    }
}

class DisappearEvent {
    constructor(json) {
        this.startTime = json["startTime"];
        this.endTime = json["endTime"];
        this.startOpacity = json["start"];
        this.endOpacity = json["end"];
    }
}

class MoveEvent {
    constructor(version, json) {
        this.startTime = json["startTime"];
        this.endTime = json["endTime"];
        if (version === 1) {
            this.startX = json["start"];
            this.endX = json["end"];
            this.startY = this.startX % 1000;
            this.endY = this.endX % 1000;
            this.startX = (this.startX - this.startY) / 1000 / 880
            this.endX = (this.endX - this.endY) / 1000 / 880
            this.startY /= 520;
            this.endY /= 520;
        } else {
            this.startX = json["start"];
            this.endX = json["end"];
            this.startY = json["start2"];
            this.endY = json["end2"];
        }
    }
}

class RotateEvent {
    constructor(json) {
        this.startTime = json["startTime"];
        this.endTime = json["endTime"];
        // 弧度制便于计算三角函数
        this.startRadians = json["start"] / 180 * Math.PI;
        this.endRadians = json["end"] / 180 * Math.PI;
    }
}

// Async process chart
function processChart() {
    return new Promise((resolve) => {
        resolve(new Chart(chart_json));
    });
}

// Gaussian Blur
// Code from https://segmentfault.com/a/1190000038705566
// Modified by pxinz, for apply on ImageData
function genKernelsForGaussian(sigma, n) {
    const wIdeal = Math.sqrt((12 * Math.pow(sigma, 2)) / n + 1)
    let wl = Math.floor(wIdeal)
    if (wl % 2 === 0) {
        wl--
    }
    const wu = wl + 2
    let m =
        (12 * Math.pow(sigma, 2) - n * Math.pow(wl, 2) - 4 * n * wl - 3 * n) /
        (-4 * wl - 4)
    m = Math.round(m)
    const sizes = []
    for (let i = 0; i < n; i++) {
        sizes.push(i < m ? wl : wu)
    }
    return sizes
}

// horizontal fast motion blur
function hFastMotionBlur(src, dest, width, height, radius) {
    for (let off = 0; off < 4; off++) {
        for (let i = 0; i < height; i++) {
            let accumulation = radius * src[(i * width) * 4 + off]
            for (let j = 0; j <= radius; j++) {
                accumulation += src[(i * width + j) * 4 + off]
            }
            dest[(i * width) * 4 + off] = Math.round(accumulation / (2 * radius + 1))
            for (let j = 1; j < width; j++) {
                const left = Math.max(0, j - radius - 1)
                const right = Math.min(width - 1, j + radius)
                accumulation =
                    accumulation + (src[(i * width + right) * 4 + off] - src[(i * width + left) * 4 + off])
                dest[(i * width + j) * 4 + off] = Math.round(accumulation / (2 * radius + 1))
            }
        }
    }
}

// vertical fast motion blur
function vFastMotionBlur(src, dest, width, height, radius) {
    for (let off = 0; off < 4; off++) {
        for (let i = 0; i < width; i++) {
            let accumulation = radius * src[i * 4 + off]
            for (let j = 0; j <= radius; j++) {
                accumulation += src[(j * width + i) * 4 + off]
            }
            dest[i * 4 + off] = Math.round(accumulation / (2 * radius + 1))
            for (let j = 1; j < height; j++) {
                const top = Math.max(0, j - radius - 1)
                const bottom = Math.min(height - 1, j + radius)
                accumulation =
                    accumulation + src[(bottom * width + i) * 4 + off] - src[(top * width + i) * 4 + off]
                dest[(j * width + i) * 4 + off] = Math.round(accumulation / (2 * radius + 1))
            }
        }
    }
}

function _fastBlur(src, dest, width, height, radius) {
    hFastMotionBlur(dest, src, width, height, radius)
    vFastMotionBlur(src, dest, width, height, radius)
}

function fastBlur(src, dest, width, height, sigma) {
    const boxes = genKernelsForGaussian(sigma, 3)
    for (let i = 0; i < src.length; i++) {
        dest[i] = src[i]
    }
    _fastBlur(src, dest, width, height, (boxes[0] - 1) / 2)
    _fastBlur(src, dest, width, height, (boxes[1] - 1) / 2)
    _fastBlur(src, dest, width, height, (boxes[2] - 1) / 2)
}

function applyFastBlur(img_data, sigma) {
    const id_new = new ImageData(img_data.width, img_data.height);
    fastBlur(img_data.data, id_new.data, img_data.width, img_data.height, sigma);
    return id_new;
}

// Main
async function main() {
    const bg_proc = onResize();
    const chart_proc = processChart();
    await bg_proc;
    chart = await chart_proc;
    await init();
    console.log("proc");
    clear();
    drawBg();
    drawInfo();
    canvas.onresize = onResize;
    start_time = Date.now() - 1000;
    setInterval(update, 5);
}

function calcValue(startTime, endTime, nowTime, startValue, endValue) {
    return startValue + (nowTime - startTime) * (endValue - startValue) / (endTime - startTime);
}

function getMaxVisiblePos(x) {
    const n = Math.fround(x);
    if (!isFinite(n)) throw new TypeError('Argument must be a finite number');
    const magic = 11718.75;
    const prime = n >= magic ? 2 ** Math.floor(1 + Math.log2(n / magic)) : 1;
    const a = n / prime + 0.001;
    const r = Math.fround(a);
    if (r <= a) return r * prime;
    const a_ = new Float32Array([a]);
    new Uint32Array(a_.buffer)[0] += a_[0] <= 0 ? 1 : -1;
    return a_[0] * prime;
}

function update() {
    if (!running) {
        clearInterval(update);
        return;
    }

    const now_ms = (Date.now() - start_time) / 1000;
    console.log(now_ms)
    const lines = [];
    for (const line of chart.judgeLines) {
        const T = now_ms / line.T;
        let SE = line.speedEvents[line.nowSEIndex];
        while (SE.endTime < T && line.speedEvents.length > line.nowSEIndex - 1) {
            line.nowSEIndex++;
            SE = line.speedEvents[line.nowSEIndex];
        }
        let DE = line.disappearEvents[line.nowDEIndex];
        while (DE.endTime < T && line.disappearEvents.length > line.nowDEIndex - 1) {
            line.nowDEIndex++;
            DE = line.disappearEvents[line.nowDEIndex];
        }
        let ME = line.moveEvents[line.nowMEIndex];
        while (ME.endTime < T && line.moveEvents.length > line.nowMEIndex - 1) {
            line.nowMEIndex++;
            ME = line.moveEvents[line.nowMEIndex];
        }
        let RE = line.rotateEvents[line.nowREIndex];
        while (RE.endTime < T && line.rotateEvents.length > line.nowREIndex - 1) {
            line.nowREIndex++;
            RE = line.rotateEvents[line.nowREIndex];
        }
        // 这里没有完全按照lchzh3473的方法来，因为我认为官谱一定会将前后事件相连
        // 渲染有问题先改这里
        const x = calcValue(ME.startTime, ME.endTime, T, ME.startX, ME.endX);
        const y = calcValue(ME.startTime, ME.endTime, T, ME.startY, ME.endY);
        const opacity = calcValue(DE.startTime, DE.endTime, T, DE.startOpacity, DE.endOpacity);
        const radians = calcValue(RE.startTime, RE.endTime, T, RE.startRadians, RE.endRadians);
        const floorPosition = SE.floorPosition + SE.speed * (T - SE.startTime) * line.T;
        const ns = [];

        for (let i = line.nowNAIndex; i < line.notesAbove.length; i++) {
            const note = line.notesAbove[i];
            if (note.time < T) {
                line.nowNAIndex++;
                continue;
            }
            // const
            let currFloorPosition = note.floorPosition - floorPosition;
            if (note.type !== 3) {
                currFloorPosition *= note.speedMultiper;
            }
            if (getMaxVisiblePos(note.fs) < floorPosition && !note.hitted || currFloorPosition > 2 / 0.6) {
                continue;
            }
            ns.push([
                note.positionX,
                currFloorPosition,
                note.type,
            ])
        }
        for (let i = line.nowNBIndex; i < line.notesBelow.length; i++) {
            const note = line.notesBelow[i];
            if (note.time < T) {
                line.nowNBIndex++;
                continue;
            }
            let currFloorPosition = note.floorPosition - floorPosition;
            if (note.type !== 3) {
                currFloorPosition *= note.speedMultiper;
            }
            if (getMaxVisiblePos(note.fs) < floorPosition && !note.hitted || currFloorPosition > 2 / 0.6) {
                continue;
            }
            ns.push([
                note.positionX,
                -currFloorPosition,
                note.type,
            ])
        }
        lines.push([
            x + 2.88 * Math.cos(radians),
            x - 2.88 * Math.cos(radians),
            y + 2.88 * Math.sin(radians),
            y - 2.88 * Math.sin(radians),
            opacity,
            radians,
            x,
            y,
            ns]
        )
    }
    drawBg();
    drawInfo(true);
    let color_base;
    if (ap) {
        color_base = "rgba(254,255,169,"
    } else if (fc) {
        color_base = "rgba(162,238,255,"
    } else {
        color_base = "rgba(255,255,255,"
    }
    ctx.lineWidth = Math.max(2, 0.0075 * canvas.height);
    for (const line of lines) {
        ctx.translate(convertX(line[6]), convertY(line[7]));
        ctx.rotate(-line[5]);
        ctx.strokeStyle = color_base + line[4].toString() + ")";
        ctx.beginPath();
        ctx.moveTo(convertX(-2.88), 0);
        ctx.lineTo(convertX(2.88), 0);
        ctx.closePath();
        ctx.stroke();
        for (const note of line[8]) {
            const img = notes_img[note[2] - 1][0];
            ctx.drawImage(img,
                -notes_size[note[2] - 1][0][0] / 2 +
                X * (note[0]),
                -notes_size[note[2] - 1][0][1] / 2 +
                -Y * (note[1]),
                notes_size[note[2] - 1][0][0],
                notes_size[note[2] - 1][0][1]
            );
        }
        ctx.rotate(line[5]);
        ctx.translate(-convertX(line[6]), -convertY(line[7]));
    }
}

function convertX(x) {
    return x * canvas.width;
}

function convertY(y) {
    return (1 - y) * canvas.height;
}

async function onResize() {
    X = canvas.width * 0.05625;
    Y = canvas.height * 0.6;
    bg = await calcBg();
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.loading = "eager";
        img.onload = () => {
            resolve(img);
        };
        img.onerror = (error) => {
            reject(error);
        };
        img.src = url;
    })
}

async function init() {
    for (const i in notes_img) {
        for (const j in notes_img[i]) {
            notes_img[i][j] = loadImage(notes_img[i][j]);
        }
    }
    for (const i in notes_img) {
        for (const j in notes_img[i]) {
            notes_img[i][j] = await notes_img[i][j];
        }
    }
    for (const i in notes_img) {
        const ratio = canvas.width / 8 / notes_img[i][0].width;
        for (const j in i) {
            notes_size[i][j][0] = notes_img[i][j].width * ratio;
            notes_size[i][j][1] = notes_img[i][j].height * ratio;
        }
    }
}

function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function calcBg() {
    clear();
    ctx.drawImage(bg_original, 0, 0, canvas.width, canvas.height);
    ctx.putImageData(applyFastBlur(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas.height * 0.05), 0, 0)
    ctx.fillStyle = "#000";
    ctx.globalAlpha = bg_darkness;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    return await loadImage(canvas.toDataURL("image/png"));
}

function drawBg() {
    ctx.drawImage(bg, 0, 0);
}

function drawInfo(drawPlayingInfo) {
    const n = canvas.height * 0.04;
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.font = Math.floor(canvas.height * 0.04).toString() + "px displayFont"
    ctx.fillStyle = "#FFF"
    ctx.fillText(
        song_name,
        n,
        canvas.height - n);
    ctx.textAlign = "right";
    ctx.fillText(
        difficulty,
        canvas.width - n,
        canvas.height - n
    );
    if (drawPlayingInfo) {
        ctx.font = Math.floor(canvas.height * 0.05).toString() + "px displayFont"
        const displayScore = score.toString().padStart(7, "0")
        ctx.textBaseline = "top";
        ctx.fillText(
            displayScore,
            canvas.width - n,
            n
        );
    }
}
