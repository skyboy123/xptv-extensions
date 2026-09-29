// 黄果短剧 huangguo.js
// Updated for huangguoai.com new structure
// Based on original Yswag/xptv-extensions logic

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

const SITE = 'https://huangguoai.com'

const HEADERS = {
    'User-Agent': UA,
    'Accept-Language': 'zh-CN,zh;q=0.9',
    Referer: SITE + '/'
}

const TABS = [
    {name:'首页',id:'home'},
    {name:'AI成人短剧',id:'ai-duanju'},
    {name:'AI成人漫剧',id:'ai-manju'},
    {name:'AI换脸',id:'ai-huanlian'},
    {name:'AI魔改',id:'ai-mogai'},
    {name:'排行榜',id:'ranks/hot'}
]

function fix(u){
    if(!u) return ''
    if(u.startsWith('//')) return 'https:'+u
    if(u.startsWith('/')) return SITE+u
    return u
}

function stripTags(s){
    return String(s||'').replace(/<[^>]*>/g,'').trim()
}

async function fetchHtml(url,referer){
    const headers = Object.assign({},HEADERS,referer?{Referer:referer}:{})
    const r = await $fetch.get(url,{headers})
    return typeof r.data==='string'?r.data:''
}

function parseCards(html){
    const list=[]
    const re=/<div[^>]*class="[^"]*hg-drama-card[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g
    let m
    while((m=re.exec(html))!==null){
        const b=m[0]
        const id=b.match(/\/detail\/(\d+)\//)
        if(!id) continue
        const title=b.match(/hg-drama-card__title[^>]*>([\s\S]*?)<\/a>/)
        const img=b.match(/(?:data-src|src)="([^"]+)"/)
        list.push({
            vod_id:id[1],
            vod_name:title?stripTags(title[1]):'',
            vod_pic:img?fix(img[1]):'',
            ext:{id:id[1]}
        })
    }
    return list
}

async function getLocalInfo(){
    return jsonify({ver:1,name:'黄果短剧',api:'csp_huangguo',type:3})
}

async function getConfig(){
    return jsonify({
        ver:1,
        title:'黄果短剧',
        tabs:TABS.map(x=>({name:x.name,ext:{id:x.id}}))
    })
}

async function getCards(ext){
    ext=argsify(ext)
    const id=ext.id||'home'
    const page=ext.page||1
    try{
        const url=id==='home'?SITE+'/':SITE+'/'+id+'/'+(page>1?page+'/':'')
        const html=await fetchHtml(url)
        return jsonify({list:parseCards(html),page:page})
    }catch(e){
        return jsonify({list:[],page:page})
    }
}

async function getTracks(ext){
    ext=argsify(ext)
    const id=ext.id
    if(!id) return jsonify({list:[]})

    try{
        const html=await fetchHtml(SITE+'/detail/'+id+'/')
        const tracks=[]

        const re=/<a[^>]*class="[^"]*hg-web-play__ep[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
        let m

        while((m=re.exec(html))!==null){
            tracks.push({
                name:stripTags(m[2]),
                ext:{url:fix(m[1])}
            })
        }

        if(!tracks.length){
            const total=html.match(/更新至\s*(\d+)\s*集/)
            if(total){
                for(let i=1;i<=Number(total[1]);i++){
                    tracks.push({
                        name:String(i).padStart(2,'0'),
                        ext:{
                            url:SITE+'/video/'+id+'/ep-'+i+'/'
                        }
                    })
                }
            }
        }

        return jsonify({
            list:[{
                title:'黄果短剧',
                tracks:tracks
            }]
        })
    }catch(e){
        return jsonify({list:[]})
    }
}

async function getPlayinfo(ext){
    ext=argsify(ext)
    const url=ext.url||''
    if(!url) return jsonify({urls:[]})

    try{
        const html=await fetchHtml(url,SITE)

        let play=''

        const m=html.match(/id="videoInitialData"[^>]*>([\s\S]*?)<\/script>/)

        if(m){
            const data=JSON.parse(m[1])
            const ep=String(ext.ep||'1')
            play=(data.epPlaySrcs||{})[ep]||data.videoSrc||''
        }

        if(!play){
            const m3u8=html.match(/https?:\/\/[^"'\\]+\.m3u8[^"'\\]*/)
            if(m3u8) play=m3u8[0]
        }

        play=play.replace(/\\u0026/g,'&')

        return jsonify({
            urls:[play],
            headers:[{
                'User-Agent':UA,
                Referer:SITE+'/'
            }]
        })

    }catch(e){
        return jsonify({urls:[]})
    }
}

async function search(ext){
    ext=argsify(ext)
    const kw=ext.text||ext.wd||''
    if(!kw) return jsonify({list:[]})

    try{
        const html=await fetchHtml(
            SITE+'/search/video/'+encodeURIComponent(kw)+'/'
        )
        return jsonify({
            list:parseCards(html),
            page:1
        })
    }catch(e){
        return jsonify({list:[]})
    }
}
