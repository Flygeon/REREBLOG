---
title: Markdown 极其详细测试文档
published: 2026-10-02
description: 一份用于测试 Markdown 渲染器语法支持程度的详尽文档，覆盖 CommonMark 核心语法、GFM 扩展与常见的非标准扩展
tags:
  - Markdown
  - 测试
category: 分享
draft: false
updated: 2026-10-02
pinned: false
---

# Markdown 渲染测试文档

> 本文档用于测试 Markdown 渲染器对各类语法的支持程度。
> 包含:CommonMark 核心语法、GFM 扩展、以及常见的非标准扩展。

---

## 1. 标题 (Headings)

# H1 一级标题
## H2 二级标题
### H3 三级标题
#### H4 四级标题
##### H5 五级标题
###### H6 六级标题

Setext 风格一级标题
===================

Setext 风格二级标题
-------------------

####### 七个 # 不是标题(应显示为普通文本)

#没有空格的井号(多数渲染器不识别为标题)

## 带 *强调* 和 `代码` 的标题 ##

---

## 2. 段落与换行 (Paragraphs & Line Breaks)

这是第一个段落。
这一行与上一行之间只有一个换行符(软换行)。

这是第二个段落,与上一段之间有一个空行。

行尾两个空格实现硬换行:  
这一行应该另起一行。

行尾反斜杠实现硬换行:\
这一行也应该另起一行。

使用 HTML 换行标签:<br>这里是 br 之后的内容。

    以四个空格缩进的内容是缩进代码块,不是段落。

---

## 3. 强调 (Emphasis)

*斜体 (星号)*
_斜体 (下划线)_

**粗体 (星号)**
__粗体 (下划线)__

***粗斜体 (星号)***
___粗斜体 (下划线)___
**_粗体中嵌套斜体_**
*__斜体中嵌套粗体__*

~~删除线 (GFM)~~

==高亮文本 (扩展)==

H~2~O (下标,扩展)
X^2^ (上标,扩展)
<sub>HTML 下标</sub> 与 <sup>HTML 上标</sup>

<u>HTML 下划线</u>
<mark>HTML 标记高亮</mark>
<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>

单词内部强调:un*frigging*believable
中文内强调:这是**中文粗体**和*中文斜体*,紧邻文字时也应生效。

未闭合的强调:*没有结束的星号
下划线在单词中:snake_case_variable_name 不应被渲染为斜体

---

## 4. 转义字符 (Escaping)

\*不是斜体\*
\**不是粗体\**
\# 不是标题
\- 不是列表
\1. 不是有序列表
\> 不是引用
\[不是链接\](不是url)
\`不是代码\`
\\ 反斜杠本身
\| 竖线
\<div\> 尖括号

可转义的全部字符:
\\ \` \* \_ \{ \} \[ \] \( \) \# \+ \- \. \! \| \< \>

---

## 5. 列表 (Lists)

### 5.1 无序列表

- 使用减号
- 第二项
- 第三项

* 使用星号
* 第二项

+ 使用加号
+ 第二项

### 5.2 有序列表

1. 第一项
2. 第二项
3. 第三项

起始数字不为 1:

5. 从 5 开始
6. 下一项
7. 再下一项

所有数字相同(渲染时仍应递增):

1. 项目
1. 项目
1. 项目

### 5.3 嵌套列表

- 一级项目 A
  - 二级项目 A.1
    - 三级项目 A.1.a
      - 四级项目 A.1.a.i
    - 三级项目 A.1.b
  - 二级项目 A.2
- 一级项目 B
  1. 嵌套有序 B.1
  2. 嵌套有序 B.2
     - 再嵌套无序
     - 再嵌套无序

1. 有序一级
   - 无序二级
   - 无序二级
2. 有序一级
   1. 有序二级
   2. 有序二级

### 5.4 松散列表 (Loose List)

- 第一项

- 第二项(项之间有空行,会被包裹在 `<p>` 中)

- 第三项

### 5.5 列表项内含多个块

1. 第一步:安装依赖

````bash
   npm install
````

2. 第二步:运行项目

   > 注意:确保端口 3000 未被占用。

3. 第三步:打开浏览器访问
   
   访问 `http://localhost:3000`,这是同一列表项内的第二个段落。

### 5.6 任务列表 (GFM)

- [x] 已完成的任务
- [ ] 未完成的任务
- [x] 已完成,含 **粗体** 与 `代码`
  - [ ] 嵌套未完成子任务
  - [x] 嵌套已完成子任务
- [ ] 含 [链接](https://example.com) 的任务

### 5.7 定义列表 (扩展)

术语 1
: 这是术语 1 的定义。

术语 2
: 这是术语 2 的第一个定义。
: 这是术语 2 的第二个定义。

---

## 6. 链接 (Links)

### 6.1 行内链接

[普通链接](https://www.example.com)
[带标题的链接](https://www.example.com "这是 title 提示")
[带单引号标题](https://www.example.com 'single quote title')
[相对路径链接](./docs/readme.md)
[锚点链接](#1-标题-headings)
[邮件链接](mailto:test@example.com)
[含空格的 URL](<https://www.example.com/path with spaces>)
[含括号的 URL](https://en.wikipedia.org/wiki/Markdown_(disambiguation))

### 6.2 引用式链接

[引用式链接][ref1]
[隐式引用式链接][]
[简写引用式链接]
[大小写不敏感][REF1]

[ref1]: https://www.example.com "引用链接标题"
[隐式引用式链接]: https://www.example.org
[简写引用式链接]: https://www.example.net

### 6.3 自动链接

<https://www.example.com>
<test@example.com>
https://www.example.com (GFM 裸 URL 自动链接)
www.example.com (GFM www 自动链接)
test@example.com (GFM 裸邮箱自动链接)

### 6.4 带格式的链接

[**粗体链接**](https://example.com) 与 [*斜体链接*](https://example.com) 与 [`代码链接`](https://example.com)

---

## 7. 图片 (Images)

![替代文本](https://via.placeholder.com/150 "图片标题")

![无标题图片](https://via.placeholder.com/100x50)

![引用式图片][img1]

[img1]: https://via.placeholder.com/120x60 "引用式图片标题"

[![带链接的图片](https://via.placeholder.com/80)](https://www.example.com)

![失效图片(应显示 alt 文本)](https://invalid.example.invalid/404.png)

<img src="https://via.placeholder.com/200x100" alt="HTML 图片" width="200" height="100">

<p align="center">
  <img src="https://via.placeholder.com/100" alt="居中图片">
</p>

---

## 8. 代码 (Code)

### 8.1 行内代码

使用 `console.log()` 输出内容。
包含反引号的代码:`` `backtick` ``
前后有空格:`` ` ``
空格保留:`  两个前导空格`

### 8.2 缩进代码块

    function indented() {
        return "四个空格缩进";
    }

### 8.3 围栏代码块

````
无语言标识的代码块
保留    空格
	以及制表符
````

~~~
使用波浪线围栏
~~~

````javascript
// JavaScript
const greet = (name) => {
  console.log(`Hello, ${name}!`);
  return { message: "hi", count: 42, active: true };
};

class Animal {
  #secret = 1;
  static create() { return new Animal(); }
}

async function fetchData(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error(e);
  }
}
````

````python
# Python
from dataclasses import dataclass
from typing import List

@dataclass
class User:
    name: str
    age: int = 18

def fib(n: int) -> List[int]:
    a, b = 0, 1
    result = []
    while len(result) < n:
        result.append(a)
        a, b = b, a + b
    return result

print(f"结果: {fib(10)}")  # 中文注释
````

````typescript
interface User<T = unknown> {
  id: number;
  name: string;
  meta?: T;
}

const users: User<{ role: string }>[] = [];
export type { User };
````

````java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
````

````go
package main

import "fmt"

func main() {
    ch := make(chan int)
    go func() { ch <- 42 }()
    fmt.Println(<-ch)
}
````

````rust
fn main() {
    let v: Vec<i32> = (1..=5).collect();
    let sum: i32 = v.iter().sum();
    println!("sum = {sum}");
}
````

````c
#include <stdio.h>

int main(void) {
    printf("Hello, World!\n");
    return 0;
}
````

````sql
SELECT u.id, u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at >= '2026-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 10;
````

````bash
#!/usr/bin/env bash
set -euo pipefail

for f in *.md; do
  echo "Processing $f"
  wc -l "$f"
done
````

````json
{
  "name": "test",
  "version": "1.0.0",
  "nested": { "array": [1, 2.5, true, null, "str"] }
}
````

````yaml
name: CI
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
````

````html
<!DOCTYPE html>
<html lang="zh-CN">
  <head><meta charset="UTF-8"><title>Test</title></head>
  <body><h1 class="title">Hello</h1></body>
</html>
````

````css
:root { --main-color: #3498db; }
.card > .title:hover::after {
  content: "→";
  color: var(--main-color);
  transition: all 0.3s ease;
}
````

````diff
- 删除的行
+ 新增的行
  未变更的行
@@ -1,3 +1,3 @@
````

````markdown
# 在代码块中展示 Markdown
**这些不应被渲染**
````

````text
纯文本,无高亮
````

````markdown
外层使用四个反引号,可以包含三个反引号的代码块:

```js
console.log("nested fence");
```
````

````javascript {1,3-4} title="带元信息的代码块"
// 第 1 行(高亮)
// 第 2 行
// 第 3 行(高亮)
// 第 4 行(高亮)
````

---

## 9. 引用 (Blockquotes)

> 这是一个简单的引用。

> 这是多行引用的第一行
> 这是第二行(懒惰续行)
继续的懒惰续行也属于引用。

> 引用中的第一段
>
> 引用中的第二段

> 一级引用
>> 二级引用
>>> 三级引用
>> 回到二级
> 回到一级

> ### 引用中的标题
> - 引用中的列表项 1
> - 引用中的列表项 2
>
> ```python
> print("引用中的代码块")
> ```
>
> **粗体** 与 *斜体* 与 [链接](https://example.com)

> [!NOTE]
> GitHub 风格提示块:Note

> [!TIP]
> GitHub 风格提示块:Tip

> [!IMPORTANT]
> GitHub 风格提示块:Important

> [!WARNING]
> GitHub 风格提示块:Warning

> [!CAUTION]
> GitHub 风格提示块:Caution

---

## 10. 分隔线 (Horizontal Rules)

---

***

___

- - -

* * *

_ _ _

-----------------------------------

---

## 11. 表格 (Tables, GFM)

### 11.1 基础表格

| 姓名 | 年龄 | 城市 |
| ---- | ---- | ---- |
| 张三 | 28   | 北京 |
| 李四 | 34   | 上海 |
| 王五 | 22   | 深圳 |

### 11.2 对齐方式

| 左对齐 | 居中对齐 | 右对齐 | 默认对齐 |
| :----- | :------: | -----: | -------- |
| L1     | C1       | R1     | D1       |
| L2     | C2       | R2     | D2       |
| 较长的左对齐内容 | 较长的居中内容 | 较长的右对齐内容 | 较长的默认内容 |

### 11.3 表格内含行内格式

| 语法 | 示例 | 渲染结果 |
| :--- | :--- | :------- |
| 粗体 | `**bold**` | **bold** |
| 斜体 | `*italic*` | *italic* |
| 删除线 | `~~strike~~` | ~~strike~~ |
| 代码 | `` `code` `` | `code` |
| 链接 | `[text](url)` | [text](https://example.com) |
| 图片 | `![alt](url)` | ![alt](https://via.placeholder.com/20) |
| 换行 | `a<br>b` | a<br>b |
| 转义竖线 | `a \| b` | a \| b |

### 11.4 无首尾竖线的简写表格

列 A | 列 B | 列 C
--- | --- | ---
1 | 2 | 3
4 | 5 | 6

### 11.5 单元格缺失与多余

| A | B | C |
|---|---|---|
| 1 | 2 |
| 3 | 4 | 5 | 6 |

### 11.6 宽表格(测试横向滚动)

| 列1 | 列2 | 列3 | 列4 | 列5 | 列6 | 列7 | 列8 | 列9 | 列10 | 列11 | 列12 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|------|------|------|
| 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 | 数据一二三四五六七八九十 |

### 11.7 HTML 表格(合并单元格)

<table>
  <thead>
    <tr><th rowspan="2">姓名</th><th colspan="2">成绩</th></tr>
    <tr><th>语文</th><th>数学</th></tr>
  </thead>
  <tbody>
    <tr><td>张三</td><td>90</td><td>95</td></tr>
    <tr><td>李四</td><td>85</td><td>88</td></tr>
  </tbody>
</table>

---

## 12. 脚注 (Footnotes)

这里有一个脚注引用[^1],这里有另一个[^note],还有一个内联脚注^[这是内联脚注的内容]。

多次引用同一脚注[^1]。

[^1]: 这是第一个脚注的内容。
[^note]: 这是命名脚注的内容,可以包含多个段落。

    缩进的第二段属于同一脚注。

````js
    console.log("脚注中的代码块");
````

---

## 13. 数学公式 (Math / LaTeX)

行内公式:$E = mc^2$,以及 $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$。

美元符号不应触发公式:价格是 \$5 和 \$10。

块级公式:

$$
\int_{-\infty}^{+\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0\mathbf{J} + \mu_0\varepsilon_0\frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

$$
A = \begin{pmatrix}
a_{11} & a_{12} & a_{13} \\
a_{21} & a_{22} & a_{23} \\
a_{31} & a_{32} & a_{33}
\end{pmatrix}, \quad
f(x) = \begin{cases}
x^2 & x \geq 0 \\
-x & x < 0
\end{cases}
$$

````math
\lim_{x \to 0} \frac{\sin x}{x} = 1
````

---

## 14. 图表 (Mermaid)

````mermaid
graph TD
    A[开始] --> B{是否通过?}
    B -- 是 --> C[继续]
    B -- 否 --> D[终止]
    C --> E[结束]
    D --> E
````

````mermaid
sequenceDiagram
    participant U as 用户
    participant S as 服务器
    participant D as 数据库
    U->>S: 发送请求
    S->>D: 查询数据
    D-->>S: 返回结果
    S-->>U: 返回响应
````

````mermaid
pie title 语言占比
    "JavaScript" : 40
    "Python" : 30
    "Go" : 20
    "其他" : 10
````

````mermaid
gantt
    title 项目计划
    dateFormat  YYYY-MM-DD
    section 设计
    需求分析 :a1, 2026-10-01, 7d
    原型设计 :after a1, 5d
    section 开发
    编码实现 :2026-10-13, 14d
````

---

## 15. 内嵌 HTML

<div style="padding: 12px; border: 1px solid #ccc; border-radius: 6px;">
  <strong>HTML 块级元素</strong> 内含 <em>行内元素</em>。

  Markdown 在 HTML 块内可能不被解析:**这行是否粗体?**
</div>

<details>
<summary>点击展开折叠内容</summary>

折叠区内的 **Markdown** 内容。

- 列表项 1
- 列表项 2

````python
print("折叠区中的代码")
````

</details>

<details open>
<summary>默认展开的折叠块</summary>

这个折叠块默认是展开状态。

</details>

<!-- 这是 HTML 注释,不应在渲染结果中显示 -->

<span style="color: red;">红色文字</span>
<font color="blue">蓝色文字(已废弃标签)</font>

<script>alert("XSS 测试:此脚本不应被执行");</script>
<iframe src="https://example.com" width="300" height="100"></iframe>
<a href="javascript:alert(1)">javascript 伪协议链接(应被过滤)</a>
<img src="x" onerror="alert(1)">

<video controls width="300">
  <source src="https://example.com/video.mp4" type="video/mp4">
</video>

<abbr title="HyperText Markup Language">HTML</abbr>
<ruby>漢<rt>han</rt>字<rt>ji</rt></ruby>

---

## 16. 缩写 (Abbreviations, 扩展)

HTML 和 CSS 是 Web 的基础。

*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets

---

## 17. Emoji 与特殊字符

短代码::smile: :rocket: :tada: :+1: :-1: :warning: :heart:

Unicode:😀 🎉 🚀 ❤️ 👨‍👩‍👧‍👦 🇨🇳 🏳️‍🌈

HTML 实体:&copy; &reg; &trade; &amp; &lt; &gt; &quot; &nbsp; &hellip; &mdash; &ndash;
数字实体:&#169; &#x2764; &#9731;

特殊符号:→ ← ↑ ↓ ⇒ ✓ ✗ ★ ☆ ♠ ♣ ♥ ♦ © ® ™ § ¶ † ‡ • ‣ ※

排版字符:"直引号" “弯引号” ‘单弯引号’ -- --- ... 

多语言:
- 中文:你好,世界!
- 日本語:こんにちは、世界!
- 한국어:안녕하세요, 세계!
- العربية:مرحبا بالعالم
- עברית:שלום עולם
- Русский:Привет, мир!
- Ελληνικά:Γειά σου Κόσμε
- हिन्दी:नमस्ते दुनिया
- ไทย:สวัสดีชาวโลก

零宽与控制字符测试:a​b(a 与 b 之间有零宽空格)

---

## 18. 边界情况与压力测试

### 18.1 紧邻块元素(无空行)
# 标题紧跟段落
紧跟的段落
- 紧跟的列表
> 紧跟的引用
````
紧跟的代码块
````
紧跟的段落

### 18.2 深层嵌套

- L1
  - L2
    - L3
      - L4
        - L5
          - L6
            - L7
              - L8

> L1
> > L2
> > > L3
> > > > L4
> > > > > L5

### 18.3 混合嵌套

1. 有序
   > 引用在列表中
   > - 列表在引用中
   >   ```js
   >   console.log("三层嵌套");
   >   ```
2. 继续
   | 表格 | 在列表中 |
   | ---- | -------- |
   | a    | b        |

### 18.4 超长内容

这是一个超长的单行文本,用于测试自动换行:Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 这是一段很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长的中文文本。

超长无空格字符串:
Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa

超长 URL:https://www.example.com/a/very/long/path/that/keeps/going/and/going/and/going/and/going/and/going/and/going/and/going/and/going?query=parameter&another=parameter&yet_another=parameter

````
超长代码行(测试横向滚动):const veryLongVariableName = "这是一个非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的字符串"; console.log(veryLongVariableName);
````

### 18.5 空内容

>

-

1.

| |
|-|
| |

[]()

![]()

****

____

``

### 18.6 易混淆语法

2026. 这不是有序列表(如果前面有文字)
1986\. 被转义的数字加点

* * *
**未闭合粗体
*未闭合斜体
`未闭合代码
[未闭合链接](
![未闭合图片](

a*b*c  a**b**c  a_b_c  a__b__c

**粗体中的*斜体*再中的__粗体__**

`code with **bold** inside` 不应渲染粗体

[链接中的 `代码` 与 **粗体**](https://example.com)

### 18.7 制表符与空白

制表符:	这里有一个 Tab	后面又有一个 Tab
多个空格:这里    有    多个    空格(HTML 中会折叠)
&nbsp;&nbsp;&nbsp;&nbsp;使用 nbsp 缩进

### 18.8 行内 HTML 与 Markdown 混合

<b>HTML 粗体</b> 与 **Markdown 粗体** 与 <i>HTML 斜体</i> 与 *Markdown 斜体*

<span>**span 内的 Markdown**</span>

<div>

**div 内空行后的 Markdown 会被解析**

</div>

---

## 19. 引用与参考

- Markdown 官方语法:<https://daringfireball.net/projects/markdown/>
- CommonMark 规范:<https://spec.commonmark.org/>
- GitHub Flavored Markdown:<https://github.github.com/gfm/>
- Mermaid 文档:<https://mermaid.js.org/>
- KaTeX 文档:<https://katex.org/>

---

## 20. 检查清单

渲染器应当正确处理以下项目:

- [ ] 所有六级标题与 Setext 标题
- [ ] 粗体、斜体、删除线、高亮、上下标
- [ ] 有序、无序、嵌套、松散、任务、定义列表
- [ ] 行内链接、引用式链接、自动链接
- [ ] 图片(含失效图片的 alt 回退)
- [ ] 行内代码、缩进代码块、围栏代码块与语法高亮
- [ ] 多级引用与 GitHub 提示块
- [ ] 表格对齐、转义竖线、宽表格滚动
- [ ] 脚注
- [ ] 数学公式(行内与块级)
- [ ] Mermaid 图表
- [ ] HTML 内嵌、折叠块、注释
- [ ] XSS 过滤(script、onerror、javascript: 协议)
- [ ] Emoji 与多语言文本
- [ ] 超长内容的换行与滚动
- [ ] 转义字符

---

*文档结束 · End of Document*

[^fn-end]: 这是一个未被引用的脚注(应被忽略或显示在末尾)。