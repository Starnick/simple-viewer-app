/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
// tslint:disable:no-console
import * as express from "express";
import { RpcInterfaceDefinition, BentleyCloudRpcManager, IModelToken, RpcInterface, RpcManager } from "@bentley/imodeljs-common";
import { IModelJsExpressServer } from "@bentley/imodeljs-backend";
import { Sum, CorridorModeler } from "calculator-backend";
import { Point3d } from "@bentley/geometry-core";
import { CorridorModelerRpcInterface } from "../../common/CorridorModelerRpc";

/**
 * Initializes Web Server backend
 */
export default async function initialize(rpcs: RpcInterfaceDefinition[]) {
  // tell BentleyCloudRpcManager which RPC interfaces to handle
  const rpcConfig = BentleyCloudRpcManager.initializeImpl({ info: { title: "simple-viewer-app", version: "v1.0" } }, rpcs);

  const port = Number(process.env.PORT || 3001);
  const app = express();
  const server = new IModelJsExpressServer(app, rpcConfig.protocol);
  await server.initialize(port);
  console.log("RPC backend for simple-viewer-app listening on port " + port);

  const s = new Sum();
  s.Add(15);
  s.Subtract(1.3);
  console.log(s.GetValue());
  console.log(s);
  s.Dispose();

  const pt1 = new Point3d(5, 10, 20);
  const pt2 = new Point3d(.25, .50, .75);
  const result = s.AddPoints(pt1, pt2);
  console.log(result);

  RpcManager.registerImpl(CorridorModelerRpcInterface, CorridorModelerRpcImpl);
}

export class CorridorModelerRpcImpl extends RpcInterface implements CorridorModelerRpcInterface {
  public async createRoadMesh(_iModelToken: IModelToken, alignment: string): Promise<string> {
     const modeler = new CorridorModeler();
     const json = modeler.CreateRoadMesh(alignment);

     return JSON.stringify(json);
    }
}
