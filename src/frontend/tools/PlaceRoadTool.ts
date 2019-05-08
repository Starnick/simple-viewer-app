import { PrimitiveTool, IModelApp, Viewport, BeButtonEvent, EventHandled, GraphicType, DecorateContext, GraphicBuilder } from "@bentley/imodeljs-frontend";
import { Point3d, Path, Polyface, IModelJson } from "@bentley/geometry-core";
import { ColorDef } from "@bentley/imodeljs-common";
import { CivilGeometry, AlignmentDesigner } from "calculator-frontend";
import { isNullOrUndefined } from "util";
import { CorridorModelerRpcInterface } from "../../common/CorridorModelerRpc";

class RoadMesh {
  public color: ColorDef;
  public mesh: Polyface | undefined;

  constructor() {
    this.color = ColorDef.white;
  }

  public static fromJSON(json: any): RoadMesh | undefined {
    if (isNullOrUndefined(json))
      return undefined;

    const rdmesh = new RoadMesh();

    if (json.hasOwnProperty("Color"))
      rdmesh.color = new ColorDef(json.Color as string);

    if (json.hasOwnProperty("Mesh"))
      rdmesh.mesh = IModelJson.Reader.parse(JSON.parse(json.Mesh));

    return rdmesh;
  }
}

export class PlaceRoadTool extends PrimitiveTool {
  public static toolId = "ConceptStation.PlaceRoad";
  protected readonly _locationData = new Array<Point3d>();

  private _editor: AlignmentDesigner;
  private _horizontal: Path | undefined;
  private _roadMeshes: RoadMesh[] | undefined;

  constructor() {
    super();
    this._editor = CivilGeometry.CreateAlignmentDesigner();
    this._horizontal = undefined;
    this._roadMeshes = undefined;
  }

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

  public onCleanup(): void {
    // Should explicitly delete. If JS does a GC it _should_ release the RefCountedPtr
    this._editor.delete();
  }

  public onRestartTool(): void {
    const tool = new PlaceRoadTool();
    if (!tool.run())
      tool.exitTool();
  }

  private async getMeshes(): Promise<void> {
    if (isNullOrUndefined(this._horizontal))
      return;

    const meshes = CivilGeometry.CreateDynamicRoadMeshes(this._horizontal);

    this._roadMeshes = new Array<RoadMesh>();

    for (const element of meshes) {
      const rdmesh = RoadMesh.fromJSON(element);
      if (isNullOrUndefined(rdmesh) || isNullOrUndefined(rdmesh.mesh))
        continue;

      this._roadMeshes.push(rdmesh);
    }
  }

  private async createRoadSegment(): Promise<void> {
    const jsonstr = JSON.stringify(IModelJson.Writer.toIModelJson(this._horizontal));
    await CorridorModelerRpcInterface.getClient().createRoadMesh(this.iModel.iModelToken, jsonstr);
  }

  public async onResetButtonDown(_ev: BeButtonEvent): Promise<EventHandled> {
    if (!isNullOrUndefined(this._horizontal)) {
      this.createRoadSegment();
      // this._horizontal = undefined;
      // this._editor.delete();
      // this._editor = CivilGeometry.CreateAlignmentDesigner();
      // _locationData = new Array<Point3d>();
    }

    this.onRestartTool();
    return EventHandled.Yes;
  }

  public async onDataButtonDown(ev: BeButtonEvent): Promise<EventHandled> {
    const point = ev.point.clone();
    if (!this._editor.InsertPoint(point)) {
        return EventHandled.Yes;
      }

    this._locationData.push(point);
    this._horizontal = this._editor.GetHorizontalCurveVector();

    this.setupAndPromptForNextAction();

    if (undefined !== ev.viewport)
      ev.viewport.invalidateDecorations();

    return EventHandled.Yes;
  }

  private addMeshesToBuilder(alignmentBuilder: GraphicBuilder): void {
    if (isNullOrUndefined(this._roadMeshes))
      return;

    this._roadMeshes.forEach((rdmesh: RoadMesh) => {
          alignmentBuilder.setSymbology(rdmesh.color, rdmesh.color, 0);
          alignmentBuilder.addPolyface(rdmesh.mesh as Polyface, true);
      });
  }

  public decorate(context: DecorateContext): void {
    if (!context.viewport.view.isSpatialView() || this._locationData.length === 0)
      return;

    const alignmentBuilder = context.createGraphicBuilder(GraphicType.WorldDecoration);
    const red = new ColorDef("rgb(255,0,0)");
    alignmentBuilder.setSymbology(red, red, 3);

    if (isNullOrUndefined(this._horizontal))
      alignmentBuilder.addLineString(this._locationData);
    else
      alignmentBuilder.addPath(this._horizontal);

    this.addMeshesToBuilder(alignmentBuilder);

    context.addDecorationFromBuilder(alignmentBuilder);
  }

  public decorateSuspended(context: DecorateContext): void { this.decorate(context); }

  public async onMouseMotion(ev: BeButtonEvent): Promise<void> {
    if (this._locationData.length > 0 && undefined !== ev.viewport) {
      const newHoriz = this._editor.GetDynamicHorizontalAlignment(ev.point);

      if (!isNullOrUndefined(newHoriz)) {
        this._horizontal = newHoriz;
        ev.viewport.invalidateDecorations();

        await this.getMeshes();
      }
    }
  }
}
