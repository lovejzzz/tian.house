"""Render one installed FMOD event to a private WAV, without device output.
Component execution only: no gameplay emitter, occlusion or listener context.
"""
import argparse,ctypes as C,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--java',type=Path,required=True);p.add_argument('--event',required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--warmup',type=int,default=0);a=p.parse_args()
if a.output.exists():raise ValueError('Preserve existing output; choose a fresh path')
core=C.CDLL(str(a.java/'libfmod.dylib'),mode=C.RTLD_GLOBAL);studio=C.CDLL(str(a.java/'libfmodstudio.dylib'))
def bind(lib,name,types):
 f=getattr(lib,name);f.argtypes=types;f.restype=C.c_int
 def call(*args):
  result=f(*args)
  if result:raise RuntimeError(f'{name}: FMOD_RESULT {result}')
 return call
P=C.c_void_p;I=C.c_int;U=C.c_uint;S=C.c_char_p;PP=C.POINTER(P)
sys=P();bind(studio,'FMOD_Studio_System_Create',[PP,U])(C.byref(sys),0x20309)
try:
 c=P();bind(studio,'FMOD_Studio_System_GetCoreSystem',[P,PP])(sys,C.byref(c))
 version=U();bind(core,'FMOD_System_GetVersion',[P,C.POINTER(U)])(c,C.byref(version))
 # FMOD_OUTPUTTYPE_WAVWRITER_NRT; synchronous studio, stream/mix from update.
 bind(core,'FMOD_System_SetOutput',[P,I])(c,5)
 bind(core,'FMOD_System_SetSoftwareFormat',[P,I,I,I])(c,48000,3,0)
 bind(core,'FMOD_System_SetDSPBufferSize',[P,U,I])(c,1024,4)
 bind(studio,'FMOD_Studio_System_Initialize',[P,I,U,U,P])(sys,128,4,3,C.cast(S(str(a.output.resolve()).encode()),P))
 load=bind(studio,'FMOD_Studio_System_LoadBankFile',[P,S,U,PP])
 for name in ['ZomboidSound.strings.bank','ZomboidSound.bank']:
  bank=P();load(sys,str(a.java/'media/sound/banks/Desktop'/name).encode(),0,C.byref(bank))
 event=P();bind(studio,'FMOD_Studio_System_GetEvent',[P,S,PP])(sys,a.event.encode(),C.byref(event))
 length=I();bind(studio,'FMOD_Studio_EventDescription_GetLength',[P,C.POINTER(I)])(event,C.byref(length))
 bind(studio,'FMOD_Studio_EventDescription_LoadSampleData',[P])(event)
 bind(studio,'FMOD_Studio_System_FlushSampleLoading',[P])(sys)
 instance=P();bind(studio,'FMOD_Studio_EventDescription_CreateInstance',[P,PP])(event,C.byref(instance))
 update=bind(studio,'FMOD_Studio_System_Update',[P])
 for _ in range(a.warmup):update(sys)
 group=P();bind(core,'FMOD_System_GetMasterChannelGroup',[P,PP])(c,C.byref(group))
 dspClock=C.c_ulonglong();parentClock=C.c_ulonglong()
 bind(core,'FMOD_ChannelGroup_GetDSPClock',[P,C.POINTER(C.c_ulonglong),C.POINTER(C.c_ulonglong)])(group,C.byref(dspClock),C.byref(parentClock))
 bind(studio,'FMOD_Studio_EventInstance_Start',[P])(instance)
 update=bind(studio,'FMOD_Studio_System_Update',[P]);state=I();getstate=bind(studio,'FMOD_Studio_EventInstance_GetPlaybackState',[P,C.POINTER(I)])
 states=[]
 for frame in range(1000):
  update(sys);getstate(instance,C.byref(state));states.append(state.value)
  if frame>10 and state.value==2:break
 else:raise RuntimeError('Event did not stop within1000 mix updates')
 for _ in range(10):update(sys)
 bind(studio,'FMOD_Studio_EventInstance_Release',[P])(instance)
 print(json.dumps(dict(version=hex(version.value),event=a.event,eventLengthMs=length.value,warmup=a.warmup,startDSPClock=dspClock.value,parentDSPClock=parentClock.value,updates=len(states),playbackStates=sorted(set(states)),output=str(a.output),applicationAcceptance=False)))
finally:bind(studio,'FMOD_Studio_System_Release',[P])(sys)
