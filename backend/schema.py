"""One stable response schema for all tailored briefs (no customer data in the schema)."""
def object_schema(properties):
    return {'type':'object','properties':properties,'required':list(properties),'additionalProperties':False}

def list_schema(item):
    return {'type':'array','items':item}

TEXT={'type':'string'}
CASE=object_schema({
    **{key:TEXT for key in ('title','intro','trigger','action','why_mesh','learning','human','risk','revenue','metric','question')},
    'news':object_schema({'headline':TEXT,'date':TEXT,'source_ids':list_schema({'type':'integer'})}),
    'agents':list_schema(object_schema({'name':TEXT,'role':TEXT})),
    'fit':object_schema({
        'departments':list_schema(object_schema({'name':TEXT,'role':TEXT})),
        'topic':TEXT,
        'outcomes':list_schema(object_schema({'name':TEXT,'impact':TEXT})),
        'systems':list_schema(object_schema({'name':TEXT,'role':TEXT})),
        'assumptions':TEXT
    })
})
TAILORED_RESPONSE_FORMAT={'type':'json_schema','json_schema':{'schema':object_schema({
    'company':TEXT,'overview':TEXT,'cases':list_schema(CASE),
    'error':{'type':'string','enum':['','insufficient_recent_news']}
})}}
COMPANY_RESPONSE_FORMAT={'type':'json_schema','json_schema':{'schema':object_schema({
    'company':TEXT,'overview':TEXT,
    'cases':list_schema(object_schema({key:value for key,value in CASE['properties'].items() if key!='fit'})),
    'error':{'type':'string','enum':['','insufficient_recent_news']}
})}}
