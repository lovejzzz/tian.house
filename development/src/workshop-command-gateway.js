import {WorkshopCommands} from './workshop-commands.js';
import {WorkshopVersions} from './workshop-versions.js';
export class WorkshopCommandGateway {
 constructor(model,catalog,library,persistence){Object.assign(this,{model,library,persistence});this.build=new WorkshopCommands(model,catalog);this.versions=new WorkshopVersions(model,library,persistence);}
 isVersion(request){return request?.operations?.some?.(op=>op?.type?.startsWith?.('versions.'));}
 async preview(request){return this.isVersion(request)?this.versions.preview(request):this.build.preview(request);}
 async commitAndSave(request){return this.isVersion(request)?this.versions.execute(request):this.build.commitAndSave(request,this.persistence);}
 async listVersions(){return {ok:true,revision:this.model.revision,versions:(await this.library.versions()).map(({requestFingerprint,...version})=>version)};}
}
