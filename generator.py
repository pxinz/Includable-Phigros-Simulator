import base64
from os import PathLike
from pathlib import Path


# OGG MIME: audio/ogg
# TTF MIME: font/ttf
def make_data_url(data: bytes, mime: str) -> str:
    return "data:{};base64,{}".format(mime, base64.b64encode(data).decode())


def generate_simulator(
        chart: str,
        illustration: bytes,
        music: bytes,

        music_name: str,
        level: str,

        width: int = 1024,
        height: int = 540,

        bg_darkness: float = 0.6,
        note_size_multiper: float = 1.0,

        music_mime: str = "audio/ogg",
        font: PathLike | bytes | None = None,
        font_mime: str = "font/ttf",
        single: bool = False
) -> str:
    with open("player.html", encoding="utf-8") as f:
        html = f.read()
    if not font:
        font = Path("./res/font.ttf").as_posix()
        font_mime = "font/ttf"

    if single:
        if isinstance(font, PathLike):
            with open("./res/font.ttf", "rb") as f:
                font = f.read()
        font = make_data_url(font, font_mime)
        with open("main.js", encoding="utf-8") as f:
            js = f.read()
        html = (html
                .replace("~FONTLINK~", font)
                .replace('<script type="text/javascript" src="main.js"></script>',
                         '<script type=\"text/javascript\">' + js + '<script>'))
    else:
        if isinstance(font, bytes):
            font = make_data_url(font, font_mime)
        html = html.replace("~FONTLINK~", str(font))

    return (html
            .replace("~IMG~", make_data_url(illustration, "image/png"))
            .replace('"~CHART~"', chart)
            # .replace("~SONG~", make_data_url(music, music_mime))
            .replace("~SONGNAME~", music_name)
            .replace("~LEVEL~", level)
            .replace("~WIDTH~", str(width))
            .replace("~HEIGHT~", str(height))
            .replace('"~BGDARKNESS~"', str(bg_darkness))
            .replace('"~NOTESIZEMUL~"', str(note_size_multiper)))


if __name__ == '__main__':
    def get_content(file):
        data = file.read()
        file.close()
        return data


    with open("player_generated.html", "w", encoding="utf-8") as f:
        f.write(generate_simulator(
            get_content(open("chart/chart.json", encoding="utf-8")),
            get_content(open("chart/illu.png", "rb")),
            get_content(open("chart/music.ogg", "rb")),
            "PRAGMATISM -RESURRECTION-",
            "IN Lv.15",
            single=True
        ))
