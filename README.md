# Includable Phigros Simulator
可嵌入其它页面的Phigros单文件模拟器，使用html+js开发  
目前仅支持格式严格的官谱json格式，因为此项目开发初衷是做官谱练习

## 特点
1. 谱面、曲绘、音乐文件嵌入html，便于单文件嵌入`（开发中：可选择多文件模式）`  
2. `开发中：自动适应窗口比例，无需自己调整`  
3. python模拟器文件生成`（开发中：提供多种语言的模拟器文件生成代码）`

## 进度
__渲染__  
> 已完成：判定线、Tap、Drag、Flick、谱面信息、分数渲染  
> 制作中：Hold、Combo、暂停键渲染、自适应比例  
> 计划：打击特效渲染、过渡动画  
> Bug：判定线反面Note倒了

__玩法__
> 制作中：判定、autoplay  
> 计划：带倒流的暂停、可以游玩谱面

__文件__
> 已完成：必选的chart嵌入文件  
> 制作中：可选的全部资源嵌入文件  
> 计划：可选的chart不嵌入文件

## 鸣谢  
- [lchzh3473的笔记](https://docs.lchzh.net/learning/phigros/) 指导渲染
- Pigeon Games 提供Phigros游戏与解包所得的测试谱面文件
