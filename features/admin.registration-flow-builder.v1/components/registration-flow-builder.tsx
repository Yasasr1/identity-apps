/**
 * Copyright (c) 2024, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import AuthenticationFlowBuilderCoreProvider from "@wso2is/admin.flow-builder-core.v1/providers/authentication-flow-builder-core-provider";
import { IdentifiableComponentInterface } from "@wso2is/core/models";
import React, { FunctionComponent, ReactElement } from "react";
import RegistrationFlowBuilderCore from "./registration-flow-builder-core";
import ResourceProperties from "./resource-property-panel/resource-properties";
import ElementFactory from "./resources/elements/element-factory";
import RegistrationFlowBuilderProvider from "../providers/registration-flow-builder-provider";

/**
 * Props interface of {@link RegistrationFlowBuilder}
 */
export type RegistrationFlowBuilderPropsInterface = IdentifiableComponentInterface;

/**
 * Entry point for the registration flow builder decorated with the necessary providers.
 *
 * @param props - Props injected to the component.
 * @returns RegistrationFlowBuilder component.
 */
const RegistrationFlowBuilder: FunctionComponent<RegistrationFlowBuilderPropsInterface> = ({
    "data-componentid": componentId = "registration-flow-builder",
    ...rest
}: RegistrationFlowBuilderPropsInterface): ReactElement => (
    <AuthenticationFlowBuilderCoreProvider ElementFactory={ ElementFactory } ResourceProperties={ ResourceProperties }>
        <RegistrationFlowBuilderProvider>
            <RegistrationFlowBuilderCore { ...rest } />
        </RegistrationFlowBuilderProvider>
    </AuthenticationFlowBuilderCoreProvider>
);

export default RegistrationFlowBuilder;
