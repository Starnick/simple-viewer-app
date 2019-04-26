/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import { RpcInterfaceDefinition, IModelReadRpcInterface, IModelTileRpcInterface, StandaloneIModelRpcInterface } from "@bentley/imodeljs-common";
import { PresentationRpcInterface } from "@bentley/presentation-common";
import { CorridorModelerRpcInterface } from "./CorridorModelerRpc";

/**
 * Returns a list of RPCs supported by this application
 */
export default function getSupportedRpcs(): RpcInterfaceDefinition[] {
  return [
    IModelReadRpcInterface,
    IModelTileRpcInterface,
    PresentationRpcInterface,
    StandaloneIModelRpcInterface,
    CorridorModelerRpcInterface,
  ];
}
