import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Logger } from '@babylonjs/core/Misc/logger';
import { Tools } from '@babylonjs/core/Misc/tools';

if (typeof window !== 'undefined') {
  try {
    Logger.LogLevels = Logger.ErrorLogLevel;
    Tools.LogLevels = Logger.ErrorLogLevel;
  } catch {}

  const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
  WebGLRenderingContext.prototype.getExtension = function (this: WebGLRenderingContext, name: any) {
    if (name === 'WEBGL_debug_renderer_info') {
      return null;
    }
    return (originalGetExtension as any).call(this, name);
  } as any;

  const originalGetExtension2 = WebGL2RenderingContext.prototype.getExtension;
  WebGL2RenderingContext.prototype.getExtension = function (this: WebGL2RenderingContext, name: any) {
    if (name === 'WEBGL_debug_renderer_info') {
      return null;
    }
    return (originalGetExtension2 as any).call(this, name);
  } as any;
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
