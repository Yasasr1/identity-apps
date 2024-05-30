/**
 * Copyright (c) 2023, WSO2 LLC. (https://www.wso2.com).
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

import UserPreferenceProvider from "@wso2is/admin.core.v1/providers/user-preferences-provider";
import React from "react";
import "@testing-library/jest-dom";
import { fullPermissions } from "./__mocks__/permissions";
import { render, screen } from "../../../test-configs/utils";
import AuthenticationFlowVisualEditor, {
    AuthenticationFlowVisualEditorPropsInterface
} from "../authentication-flow-visual-editor";

describe("AuthenticationFlowVisualEditor", () => {
    const defaultProps: AuthenticationFlowVisualEditorPropsInterface = {
        onIDPCreateWizardTrigger: jest.fn(),
        onUpdate: jest.fn()
    };

    it("renders the AuthenticationFlowVisualEditor component", () => {
        render(
            <UserPreferenceProvider>
                <AuthenticationFlowVisualEditor { ...defaultProps } />
            </UserPreferenceProvider>
            , { allowedScopes: fullPermissions });

        const authenticationFlowVisualEditor: Element = screen.getByTestId("authentication-flow-visual-editor");

        expect(authenticationFlowVisualEditor).toBeInTheDocument();
    });
});
