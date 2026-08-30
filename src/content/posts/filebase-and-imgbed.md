---
title: 介绍Filebase免费对象存储，以及快速搭建图床教程
published: 2026-07-27
description: 本文主要介绍Filebase这个新的免费对象存储平台提供5 GB的免费存储空间，兼容S3端点，非常适合搭建图床服务
tags:
  - 图床
  - 对象存储
category: 有趣的项目
draft: false
updated: 2026-07-27
pinned: false
---
继R2和B2后又发现了一家新的且门槛更低的对象存储——Filebase，注册仅需一个邮箱，无需绑卡，缺点就是免费版只支持私有存储桶，不过可以通过 S3 API 配合 Access Key 和 Secret Key 访问，所以只需要自己搭建一个图床即可享用

## 注册

访问[https://console.filebase.com/](https://console.filebase.com/)直接使用邮箱或者Google（~~咕噜咕噜~~） 注册即可

然后左侧选择**“Buckets”**，新建选择S3存储，取一个独一无二的名字即可

然后你就可以往桶里面存东西了，但由于免费版只支持私有桶，不支持公开，所以想把它当图床用还需要一些其他手段

首先找到**“Access Keys”**选项卡，记住**Access token和Secret key**备用，等会搭建图床用得到

## Cloudflare Pages搭建图床

### 部署图床

搭建图床的项目有很多，我使用的是

[MarSeventh/CloudFlare-ImgBed: 🏖️ A serverless, open-source file hosting solution built on Cloudflare. Supports image hosting, secure file storage, and personal cloud drive capabilities.](https://github.com/MarSeventh/CloudFlare-ImgBed)

跟着部署教程走还是很容易的，Pages教程在这[Cloudflare Pages 部署 | CloudFlare ImgBed](https://cfbed.sanyue.de/deployment/pages.html)

搭建完大概长这样子

![imgbed.webp](https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/imgbed.webp)



### 设置对象存储

/dashboard进入后台，默认没有账号密码记得及时修改，在系统设置-上传设置里选择s3

![imgbed-setting.webp](https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/imgbed-setting.webp)

Endpoint填写[https://s3.filebase.io](https://s3.filebase.io)。

密钥ID和访问密钥分别对应上面提到的**Access token和Secret key**

完成之后不出意外的话就能上传图片并正确获取到直链了

### 接入EdgeOne的CDN

直接使用的话速度一般，可以接入腾讯EO来使用边缘节点进行加速

首先先在cf pages绑定好域名，然后在EdgeOne里添加一下，汇源改成源站

（没有EO账号的话可以注册一下，海外版不需要备案可以直接用）

再配置下图片的浏览器和节点缓存，把缓存时间调大

![eorule.webp](https://raw.flygeon.eu.org/Flygeon/Astro/refs/heads/main/image/eorule.webp)

这样你就得到了一个访问速度可观的免费对象存储



&nbsp;