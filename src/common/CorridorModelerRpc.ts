import { RpcInterface, IModelToken, RpcManager } from "@bentley/imodeljs-common";

export abstract class CorridorModelerRpcInterface extends RpcInterface {
  public static version = "1.0.0";  // The API version of the interface
  public static types = () => [IModelToken]; // Types used
  public static getClient() { return RpcManager.getClientForInterface(this); }
  public async createRoadMesh(_iModelToken: IModelToken, _alignment: string): Promise<string> { return this.forward(arguments); }
}
