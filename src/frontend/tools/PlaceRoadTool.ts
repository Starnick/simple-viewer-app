import { PrimitiveTool, IModelApp, Viewport, BeButtonEvent, EventHandled, GraphicType, DecorateContext } from "@bentley/imodeljs-frontend";
import { Point3d } from "@bentley/geometry-core";
import { ColorDef } from "@bentley/imodeljs-common";

export class PlaceRoadTool extends PrimitiveTool {
  public static toolId = "ConceptStation.PlaceRoad";
  protected readonly _locationData = new Array<Point3d>();

  public isCompatibleViewport(vp: Viewport | undefined, isSelectedViewChange: boolean): boolean { return (super.isCompatibleViewport(vp, isSelectedViewChange) && undefined !== vp && vp.view.isSpatialView()); }
  public requireWriteableTarget(): boolean { return false; }
  public onPostInstall() { super.onPostInstall(); this.setupAndPromptForNextAction(); }

  protected showPrompt(): void { IModelApp.notifications.outputPromptByKey(0 === this._locationData.length ? "CoreTools:tools.Measure.Distance.Prompts.FirstPoint" : "CoreTools:tools.Measure.Distance.Prompts.NextPoint"); }

  protected setupAndPromptForNextAction(): void {
    IModelApp.accuSnap.enableSnap(true);
    IModelApp.accuDraw.deactivate(); // Don't enable AccuDraw automatically when starting dynamics.
    IModelApp.toolAdmin.setCursor(0 === this._locationData.length ? IModelApp.viewManager.crossHairCursor : IModelApp.viewManager.dynamicsCursor);
    this.showPrompt();
  }

  public onRestartTool(): void {
    const tool = new PlaceRoadTool();
    if (!tool.run())
      tool.exitTool();
  }

  public async onDataButtonDown(ev: BeButtonEvent): Promise<EventHandled> {
    if (this._locationData.length > 0)
      this._locationData[this._locationData.length - 1] = ev.point.clone();

    const point = ev.point.clone();
    this._locationData.push(point);
    this.setupAndPromptForNextAction();
    if (undefined !== ev.viewport)
      ev.viewport.invalidateDecorations();
    return EventHandled.Yes;
  }

  public decorate(context: DecorateContext): void {
    if (!context.viewport.view.isSpatialView())
      return;

    const alignmentBuilder = context.createGraphicBuilder(GraphicType.WorldDecoration);
    const red = new ColorDef("rgb(255,0,0)");
    alignmentBuilder.setSymbology(red, red, 3);
    alignmentBuilder.addLineString(this._locationData);

    context.addDecorationFromBuilder(alignmentBuilder);
  }

  public decorateSuspended(context: DecorateContext): void { this.decorate(context); }

  public async onMouseMotion(ev: BeButtonEvent): Promise<void> {
    if (this._locationData.length > 0 && undefined !== ev.viewport) {
      this._locationData[this._locationData.length - 1] = ev.point.clone();
      ev.viewport.invalidateDecorations();
    }
  }
}
